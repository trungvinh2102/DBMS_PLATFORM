"""Tests that the removed SQLLab Git workspace API is no longer registered."""

from fastapi import FastAPI

from core.routers import register_routers


def collect_paths(routes, prefix=""):
    paths = []
    for route in routes:
        if hasattr(route, "path"):
            paths.append(prefix + route.path)
        else:
            paths.extend(
                collect_paths(
                    route.original_router.routes,
                    prefix + route.include_context.prefix,
                )
            )
    return paths


def test_no_workspace_route_is_registered():
    app = FastAPI()
    register_routers(app)
    paths = collect_paths(app.routes)

    assert not any(path.startswith("/api/workspace") for path in paths)
