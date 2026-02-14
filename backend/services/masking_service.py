"""
masking_service.py

Service for managing and applying data masking policies.
"""
from typing import List, Optional, Dict
import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from models.masking import MaskingRule, MaskingRuleType
from models.metadata import Role
import sqlglot
from sqlglot import exp

logger = logging.getLogger(__name__)

class MaskingService:

    @staticmethod
    def get_policies_for_user(db: Session, user_role_ids: List[str]) -> List[MaskingRule]:
        """
        Retrieve active masking policies applicable to the given user roles.
        If user_role_ids is empty, only generic (roleId=None) policies apply.
        """
        filters = [MaskingRule.isEnabled == True]
        role_filters = [MaskingRule.roleId == None]
        if user_role_ids:
            role_filters.append(MaskingRule.roleId.in_(user_role_ids))
        
        from sqlalchemy import or_
        filters.append(or_(*role_filters))

        return db.query(MaskingRule).filter(*filters).order_by(MaskingRule.priority.desc()).all()

    @staticmethod
    def apply_masking(sql: str, policies: List[MaskingRule], dialect: str = "postgres") -> str:
        """
        Rewrite the SQL query to apply masking rules based on the provided policies.
        """
        if not policies:
            return sql

        try:
            parsed = sqlglot.parse_one(sql, read=dialect)
        except Exception as e:
            logger.error(f"Failed to parse SQL for masking: {e}")
            return sql

        # Create a lookup map: (table, column) -> policy
        # Keys are lowercased for case-insensitive matching
        policy_map: Dict[tuple, MaskingRule] = {}
        for p in policies:
            t = p.resourceTable.lower()
            c = p.resourceColumn.lower()
            policy_map[(t, c)] = p

        def transform_node(node):
            if isinstance(node, exp.Column):
                col_name = node.name.lower()
                # If table alias or name is present, use it. Otherwise, extensive search required.
                # For simplicity, we check if column name is unique in our policy map or matches generic rules.
                table_name = node.table.lower() if node.table else None

                # Find matching policy
                matched_policy = None
                if table_name:
                    matched_policy = policy_map.get((table_name, col_name))
                else:
                    # If table not specified in column reference, try to match by column name
                    # prioritizing if we only have one policy for that column name.
                    candidates = [p for (t, c), p in policy_map.items() if c == col_name]
                    if len(candidates) == 1:
                        matched_policy = candidates[0]
                    # ambiguous cases are ignored for safety in this MVP
                
                if matched_policy:
                    return MaskingService._create_masked_expression(node, matched_policy)
            
            return node

        # Apply transformation ONLY to the SELECT expressions (projections)
        # We find all Select nodes
        for select in parsed.find_all(exp.Select):
            new_expressions = []
            for expression in select.expressions:
                # Transform each expression in the select list
                # This handles 'col', 'col AS alias', 'func(col)', etc.
                new_expr = expression.transform(transform_node)
                new_expressions.append(new_expr)
            
            # Update the select expressions
            select.set("expressions", new_expressions)

        return parsed.sql(dialect=dialect)

    @staticmethod
    def _create_masked_expression(column_node: exp.Column, policy: MaskingRule):
        """
        Generates the SQL expression for the specific masking rule.
        """
        rule_type = policy.maskingType
        args = {}
        if policy.maskingArgs:
            try:
                args = json.loads(policy.maskingArgs)
            except:
                pass

        if rule_type == MaskingRuleType.FULL:
            return exp.Literal.string("*****")
        
        elif rule_type == MaskingRuleType.PARTIAL:
            first = args.get('start', 0)
            last = args.get('end', 0)
            mask = args.get('mask', '******')
            
            # CONCAT(LEFT(col, first), mask, RIGHT(col, last))
            return exp.Func(
                this="CONCAT",
                expressions=[
                    exp.Func(this="LEFT", expressions=[column_node, exp.Literal.number(first)]),
                    exp.Literal.string(mask),
                    exp.Func(this="RIGHT", expressions=[column_node, exp.Literal.number(last)])
                ]
            )

        elif rule_type == MaskingRuleType.EMAIL:
            # Mask user part, keep domain
            return exp.Func(
                this="CONCAT",
                expressions=[
                    exp.Literal.string("***@"),
                    exp.Func(this="SPLIT_PART", expressions=[column_node, exp.Literal.string("@"), exp.Literal.number(2)])
                ]
            )
            
        elif rule_type == MaskingRuleType.HASH:
            return exp.Func(this="MD5", expressions=[exp.Cast(this=column_node, to=exp.DataType.build("text"))])

        elif rule_type == MaskingRuleType.NULL:
            return exp.Null()

        elif rule_type == MaskingRuleType.REGEX:
            # REGEXP_REPLACE(col, pattern, replacement)
            pattern = args.get('pattern', '.*')
            replacement = args.get('replacement', '*****')
            return exp.Func(
                this="REGEXP_REPLACE",
                expressions=[
                    column_node,
                    exp.Literal.string(pattern),
                    exp.Literal.string(replacement)
                ]
            )
        
        # Fallback for unknown types -> Default to FULL masking for security
        return exp.Literal.string("*****")
