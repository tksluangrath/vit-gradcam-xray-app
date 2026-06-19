# Classification request uses FastAPI's UploadFile directly in the route handler
# (multipart/form-data cannot be modeled as a Pydantic request body).
# See routes/classify.py for the actual file parameter definition.

# This module is reserved for any future request-side Pydantic models,
# e.g. query parameters or JSON body variants.
