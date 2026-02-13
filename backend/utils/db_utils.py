"""
db_utils.py

Database utility functions and decorators for session management and error handling.
"""

from functools import wraps
from flask import jsonify
from models.metadata import SessionLocal
import logging

logger = logging.getLogger(__name__)

def handle_api_exceptions(f):
    """
    Decorator to handle exceptions in API routes consistently.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.exception(f"Error in {f.__name__}: {str(e)}")
            return jsonify({'error': str(e)}), 500
    return decorated_function

def with_session(f):
    """
    Decorator to provide a SQLAlchemy session to a function or method.
    If applied to a method (first arg 'self' or 'cls'), it injects the session as the second argument.
    Otherwise, it injects it as the first argument.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if 'session' is already provided in kwargs
        if 'session' in kwargs and kwargs['session'] is not None:
            return f(*args, **kwargs)
            
        import inspect
        sig = inspect.signature(f)
        params = list(sig.parameters.keys())
        
        session = SessionLocal()
        try:
            if params and params[0] in ('self', 'cls'):
                # For methods, the first argument in args is 'self' or 'cls'
                # We want to pass: (self, session, *other_args)
                if not args:
                    return f(session, *args, **kwargs)
                return f(args[0], session, *args[1:], **kwargs)
            else:
                # For regular functions, pass: (session, *args)
                return f(session, *args, **kwargs)
        finally:
            session.close()
    return decorated_function
