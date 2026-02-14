"""
app.py

Main Flask application entry point. Initializes the app, CORS, and registers blueprints.
"""

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables BEFORE importing routes/services
# because models/metadata.py reads DATABASE_URL at import time
load_dotenv()

from routes.database import database_bp
from routes.auth import auth_bp
from routes.user import user_bp
from routes.ai import ai_bp
from routes.privilege import privilege_bp
from routes.role import role_bp

def create_app():
    """Application factory for Flask."""
    app = Flask(__name__)
    CORS(app)

    # Register Blueprints
    app.register_blueprint(database_bp, url_prefix='/api/database')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(privilege_bp, url_prefix='/api/privilege')
    app.register_blueprint(role_bp, url_prefix='/api/roles')

    @app.route('/api/health')
    @app.route('/health')
    def health():
        """Health check endpoint."""
        return {'status': 'ok'}
        
    return app

if __name__ == '__main__':
    app = create_app()
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(port=5000, debug=debug)
