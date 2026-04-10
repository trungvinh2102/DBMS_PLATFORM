from abc import ABC, abstractmethod
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class BulkLoader(ABC):
    @abstractmethod
    def load(self, connection, table_name: str, schema_name: str, df: pd.DataFrame, mapping: dict = None):
        """Standard method for bulk loading a DataFrame into a target table."""
        pass

    @abstractmethod
    def validate_schema(self, connection, table_name: str, schema_name: str, df_columns: list):
        """Ensure columns and types match the target database table."""
        pass

    def _get_mapped_df(self, df: pd.DataFrame, mapping: dict):
        """Apply column mapping if provided."""
        if not mapping:
            return df
        
        # mapping is {source_col: target_col}
        return df.rename(columns=mapping)
