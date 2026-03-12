"""
backend/app.py

Main Flask application entry point.
Initializes the app, CORS, and registers blueprints.
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables BEFORE importing routes/services
# because models/metadata.py reads DATABASE_URL at import time
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

from routes.database import database_bp
from routes.auth import auth_bp
from routes.user import user_bp
from routes.ai import ai_bp

def create_app():
    """Application factory for Flask."""
    app = Flask(__name__)
    
    # Configure CORS - Use exact origins and support common headers
    CORS(app, resources={r"/*": {
        "origins": ["http://localhost:3001", "http://127.0.0.1:3001", "app://."],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }})
    # No manual headers needed, flask-cors will handle it.

    # Register Blueprints
    app.register_blueprint(database_bp, url_prefix='/api/database')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    @app.before_request
    def log_request_info():
        # app.logger.debug('Headers: %s', request.headers)
        # app.logger.debug('Body: %s', request.get_data())
        if request.method != 'OPTIONS':
            print(f"API Request: {request.method} {request.path}")

    @app.route('/api/health')
    @app.route('/health')
    def health():
        """Health check endpoint."""
        return {'status': 'ok'}
        
    @app.errorhandler(404)
    def handle_404(e):
        print(f"404 Error: {request.method} {request.path}")
        return jsonify(error="Not Found", path=request.path), 404

    return app

if __name__ == '__main__':
    app = create_app()
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    # Bind to 0.0.0.0 to ensure accessibility from within desktop apps (Electron/Tauri)
    # This helps avoid localhost/127.0.0.1/::1 resolution issues
    port = int(os.getenv('PORT', 5050))
    app.run(host='0.0.0.0', port=port, debug=debug)
