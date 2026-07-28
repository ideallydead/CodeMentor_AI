import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.api.routes import router
from backend.db.session import init_db
from backend.core.config import settings

app = FastAPI(title='CodeMentor AI')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Path to built student portal frontend bundle
STUDENT_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "student-portal", "dist"))

if os.path.exists(os.path.join(STUDENT_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STUDENT_DIST, "assets")), name="assets")


@app.on_event('startup')
async def startup_event():
    init_db(settings.database_url)


@app.get('/')
def root():
    index_path = os.path.join(STUDENT_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {'status': 'CodeMentor AI backend is running'}
