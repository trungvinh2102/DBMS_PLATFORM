"""
dashboard_service.py
Service for gathering database statistics and metrics.
"""

import logging
from sqlalchemy import text
from models.metadata import SessionLocal, Db
import psutil
import os

logger = logging.getLogger(__name__)

class DashboardService:
    def get_dashboard_stats(self, db_id: str):
        """
        Gathers dashboard statistics for a specific database.
        """
        session = SessionLocal()
        try:
            db_config = session.query(Db).filter(Db.id == db_id).first()
            if not db_config:
                return {"error": "Database not found"}

            # Enhanced stats from DuckDB (Analytical engine)
            from services.analytics_service import analytics_service
            analytics_stats = analytics_service.get_query_performance_trends()
            status_dist = analytics_service.get_status_distribution()
            
            # Standard health/system stats (Default context)
            stats = {
                "health": {"score": 95 if not any(s['status'] == 'Error' for s in status_dist) else 80, "status": "Healthy"},
                "connections": {"current": 0, "max": 100, "trend": [0, 0, 0, 0, 0]},
                "performance": analytics_stats,
                "status_counts": status_dist,
                "storage": {"used_gb": 0, "free_gb": 0, "total_gb": 0},
                "top_slow_queries": []
            }

            # Dialect-specific stat gathering
            dialect = db_config.type.strip().lower()
            if dialect == 'postgresql' or dialect == 'postgres':
                stats = self._get_postgres_stats(db_config, stats)
            elif dialect == 'sqlite':
                stats = self._get_sqlite_stats(db_config, stats)

            # AI Snapshot analysis (simple rule-based for v1)
            stats["ai_summary"] = self._generate_ai_summary(stats)

            return stats
        except Exception as e:
            logger.error(f"Error gathering dashboard stats: {e}")
            return {"error": str(e)}
        finally:
            session.close()

    def _get_postgres_stats(self, db_config, stats):
        """Internal helper for PostgreSQL stats."""
        # Note: In a real app, we'd connect to the target DB using credentials
        # For this prototype/MVP, we'll use meta-queries or simulated data if connection fails
        try:
            # Simulated stats for MVP based on real schemas
            # pg_stat_activity: count total backends
            # pg_database_size: size of current database
            stats["connections"]["current"] = 12 # Simulated from pg_stat_activity
            stats["storage"]["used_gb"] = 4.2
            stats["storage"]["free_gb"] = 5.8
            stats["storage"]["total_gb"] = 10.0
            
            # Simulated performance trend
            import random
            stats["performance"] = [
                {"time": f"{h}:00", "cpu": random.randint(5, 45), "memory": random.randint(30, 60), "tps": random.randint(80, 200)}
                for h in range(8, 16)
            ]
            
            # Health Score Weighting logic
            if stats["connections"]["current"] > 80:
                 stats["health"]["score"] = 70
                 stats["health"]["status"] = "Warning"
            
            return stats
        except Exception:
            return stats

    def _get_sqlite_stats(self, db_config, stats):
        """Internal helper for SQLite stats."""
        try:
            # SQLite specific file-size logic
            if os.path.exists(db_config.database):
                size_bytes = os.path.getsize(db_config.database)
                stats["storage"]["used_gb"] = round(size_bytes / (1024**3), 4)
            return stats
        except Exception:
            return stats

    def _generate_ai_summary(self, stats):
        """Narrative summary of status."""
        score = stats["health"]["score"]
        if score >= 90:
            return "Your database is humming along nicely. Health is optimal and connections are well within limits."
        elif score >= 70:
            return "Health is stable, but I've noticed a slight uptick in connection intensity. Monitor slow queries."
        else:
            return "Critical: High resource contention detected. Recommend checking for long-running transactions."

dashboard_service = DashboardService()
