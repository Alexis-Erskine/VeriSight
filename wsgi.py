import os
import sys

from app import create_app

app = create_app()

if os.getenv("FLASK_ENV") == "production":
    with app.app_context():
        try:
            from flask_migrate import upgrade
            upgrade()
            app.logger.info("Database migrations applied successfully")
        except Exception as e:
            app.logger.error("Migration failed: %s", e)
            sys.exit(1)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
