# LARALAB Heart Analyzer

This repository contains the Heart Analyzer MVP-1.

It is a FastAPI-based REST API and an initial SolidJS frontend.

## Setup

### Backend

You need Python >= 3.9.

Ideally, create a virtual environment:

    python -m venv venv  # create venv, needs to be done only once
    source venv/bin/activate  # activate venv, need to be done every time at start of development

Then install all the necessary dependencies to run the application:

    pip install -r requirements.txt

Eventually you can start the backend in development mode by executing:

    fastapi dev src/main.py

which makes the application/API accessible at [http://localhost:8000](http://localhost:8000).

When the application is running, the API documentation is accessible at [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

You need any recent version of NodeJS and [PNPM](https://pnpm.io/) installed.

Install the necessary modules using:

    pnpm i

Then the frontend can be started using:

    pnpm run dev

And is reachable at `http://localhost:3000`.

## Application Setup

* The API features two main resources: [Patients](http://localhost:8000/patients) and [Attachments](http://localhost:8000/attachments).
* Each patient can have attached an arbitrary number of attachments, where the type of attachment is identified by its `media_type` field:
    * `application/com.laralab.analysis-primitives+json`: Structured analysis results
    * `image/jpeg`: Screenshots
    * `model/gltf+json`: Segmentation 3D models

## Project structure

Patient details view imports reusable ThreeJS model view with data processed from patients medical records. For both .gltf and .json extensions data points can be processed and displayed in 2D or 3D object format.

2D model data of medical imaging for heart anatomy is displayed with Konva Overlay to see  image scans in layers in 3D space and edit the vector graphics. 

## Solution 3D Model

Scan imaging segments is visualized in 3D layers, where files with .gltf are rendered with threeJS are the main counterpart and other layers of 2D segmentation are rendered with Konva.

### Interaction

Both model layers can be interacted on mouse events - vector lines are connected for making coorections with mouse, it would be also useful to add input fields and display coordinates.
3D model orbit controls allows the camera to orbit around a target and it can be updated with mouse or the controller. 3D model includes some basic options to manipulate the display, lighting, performance with the Dat.GUI control pane. The grouped vector graphics can be moved across canvas with mouse hold and scaled with input range slider next to the 3D model controls.

Transparency for the 3D model is set to 60% to see through the layers. Both models cannot be interacted with at the same time, the link to Reorder Layers changes the active Layer to introspect.

### Data storage

I created the context from 3D object to convert the vector from this object's local space to world space and then use this context to subscribe and control data stored from other models.

It can be then decided then which context is ready to request for further processing and analysis.

