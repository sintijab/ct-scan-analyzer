from datetime import date
from typing import Optional, Literal
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic import UUID4
import starlette.status as status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


### DATA SCHEMA ###


class Link(BaseModel):
    """Named reference to other entity(ies) within the API."""

    rel: str
    href: str
    method: Literal["GET", "POST"]


class ApiModel(BaseModel):
    """Base class for all serializable API models."""

    id: UUID4
    links: list[Link] = []


class Patient(ApiModel):
    """Patient."""


class PatientSummary(Patient):
    name: str
    date_of_birth: date


class PatientFull(PatientSummary):
    sex: Literal["male", "female"]
    assigned_physician: Optional[str] = None
    clinical_notes: Optional[str] = None


class Attachment(ApiModel):
    """A piece of data attached to patient in course of the analysis by this software."""


class AttachmentSummary(Attachment):
    name: str
    media_type: str


class AttachmentFull(AttachmentSummary):
    pass


### DUMMY DATA ###


_MEDIA_TYPE_EXTENSION_MAPPING = {
    "application/com.laralab.analysis-primitives+json": "json",
    "image/jpeg": "jpeg",
    "model/gltf+json": "gltf",
}

_EXTENSION_MEDIA_TYPE_MAPPING = {v: k for k,
                                 v in _MEDIA_TYPE_EXTENSION_MAPPING.items()}


def indexed(*items: ApiModel) -> dict[UUID4, ApiModel]:
    return {item.id: item for item in items}


_DB = {
    "patients": indexed(
        PatientFull(
            id=UUID("930471cd-b69f-40a8-be5c-5205c56feade"),
            name="John Doe",
            date_of_birth=date(1960, 7, 15),
            sex="male",
            assigned_physician="Dr. Carla Clipper",
            clinical_notes="Echo shows severe mitral stenosis.",
        ),
        PatientFull(
            id=UUID("26c6f92e-e693-448d-aca1-0ec042ac0f82"),
            name="Jane Doe",
            date_of_birth=date(1964, 3, 3),
            sex="female",
            assigned_physician="Dr. Tom Tavi",
        ),
    ),
    "attachments": indexed(
        AttachmentFull(
            id=UUID("eb635c2c-d485-4f1f-af6f-64098f57010e"),
            name="measurements/mitral-annulus",
            media_type="application/com.laralab.analysis-primitives+json",
        ),
        AttachmentFull(
            id=UUID("2d687456-15bc-4e68-9f43-be9194ca03aa"),
            name="screenshot/mitral-annulus/saddle-shape",
            media_type="image/jpeg",
        ),
        AttachmentFull(
            id=UUID("0ba22873-912d-4ca8-a3aa-2c71ca246248"),
            name="3d-model/anatomical",
            media_type="model/gltf+json",
        ),
    ),
    "attachment-ownership": {
        "eb635c2c-d485-4f1f-af6f-64098f57010e": "930471cd-b69f-40a8-be5c-5205c56feade",
        "2d687456-15bc-4e68-9f43-be9194ca03aa": "930471cd-b69f-40a8-be5c-5205c56feade",
        "0ba22873-912d-4ca8-a3aa-2c71ca246248": "26c6f92e-e693-448d-aca1-0ec042ac0f82",
    },
}


### APPLICATION ###


app = FastAPI(title="LARALAB Heart Analyzer API")


app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000"],  # Allow specific origins
    allow_origins=["*"],  # Allow specific origins
    allow_credentials=True,  # Allow cookies to be sent
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all HTTP headers
)


@app.get("/")
async def root():
    return RedirectResponse(url="/docs", status_code=status.HTTP_301_MOVED_PERMANENTLY)


# This is a workaround, since there seem to be problems with the
# StaticFiles module and CORS headers
@app.get("/static/data/{file_name}")
def get_static_file(file_name: str):
    with open(f"./static/data/{file_name}", "rb") as in_file:
        data = in_file.read()
    extension = file_name.split(".")[-1]
    return Response(
        content=data,
        media_type=_EXTENSION_MEDIA_TYPE_MAPPING.get(
            extension, "application/octet-stream"
        ),
    )


def patient_with_links(patient: PatientFull) -> PatientFull:
    links = [
        Link(
            rel="self",
            href=app.url_path_for(get_patient.__name__, id=patient.id),
            method="GET",
        ),
        Link(
            rel="attachments",
            href=app.url_path_for(list_attachments.__name__)
            + f"?owner_id={patient.id}",
            method="GET",
        ),
    ]
    return patient.model_copy(update=dict(links=links))


@app.get("/patients/", response_model_exclude_unset=True)
async def list_patients() -> list[PatientSummary]:
    response = [
        PatientSummary(**patient_with_links(patient).model_dump())
        for patient in _DB["patients"].values()
    ]
    return response


@app.get("/patients/{id}")
async def get_patient(id: UUID4) -> PatientFull:
    patient = _DB["patients"].get(id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return patient_with_links(patient)


def attachment_with_links(attachment: AttachmentFull) -> AttachmentFull:
    links = [
        Link(
            rel="self",
            href=app.url_path_for(get_attachment.__name__, id=attachment.id),
            method="GET",
        ),
        Link(
            rel="data",
            href=f"/static/data/{attachment.id}.{_MEDIA_TYPE_EXTENSION_MAPPING[attachment.media_type]}",
            method="GET",
        ),
        Link(
            rel="owner",
            href=app.url_path_for(
                get_patient.__name__, id=_DB["attachment-ownership"][str(
                    attachment.id)]
            ),
            method="GET",
        ),
    ]
    return attachment.model_copy(update=dict(links=links))


@app.get("/attachments/")
async def list_attachments(owner_id: Optional[UUID4] = None) -> list[AttachmentSummary]:
    response = [
        AttachmentSummary(**attachment_with_links(att).model_dump())
        for att in _DB["attachments"].values()
    ]

    if owner_id is not None:
        response = [
            att
            for att in response
            if _DB["attachment-ownership"][str(att.id)] == str(owner_id)
        ]

    return response


@app.get("/attachments/{id}")
async def get_attachment(id: UUID4) -> AttachmentFull:
    attachment = _DB["attachments"].get(id)
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return attachment_with_links(attachment)
