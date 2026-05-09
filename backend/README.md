# whatcanicook backend

Django REST API for the WhatCanICook React frontend.

## for dev

Run the API:

```powershell
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Run tests:

```powershell
.\venv\Scripts\python.exe manage.py test
```

The React app lives in `../frontend` and proxies `/api` and `/media` to this server.

## S3 image uploads

The app uses local media storage by default. User-uploaded images use Django's
default storage. To store images with direct browser-to-S3 presigned uploads, install the
requirements and create `backend/.env`:

```env
USE_S3=True
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-west-2
AVATAR_UPLOAD_MAX_BYTES=10485760
RECIPE_IMAGE_UPLOAD_MAX_BYTES=26214400
S3_PRESIGNED_UPLOAD_EXPIRES=300
```

Avatar files are stored under `users/user_<id>/profile_pictures/`, for example
`users/user_1/profile_pictures/<generated-name>.png`.

Recipe image files are stored under `users/user_<id>/recipes/recipe_<id>/`, for
example `users/user_1/recipes/recipe_10/<generated-name>.png`.

Credentials are loaded by `django-storages`/boto3 from the normal AWS sources,
including `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ACCESS_KEY_ID`
and `AWS_S3_SECRET_ACCESS_KEY`, an AWS profile, or an attached IAM role.

Optional environment variables:

- `AWS_QUERYSTRING_AUTH`: set to `False` for public buckets/CDN URLs.
- `AWS_S3_FILE_OVERWRITE`: defaults to `False` for user uploads.
- `AVATAR_UPLOAD_MAX_BYTES`: maximum avatar upload size. Defaults to 10 MiB.
- `RECIPE_IMAGE_UPLOAD_MAX_BYTES`: maximum recipe image upload size. Defaults to 25 MiB.
- `S3_PRESIGNED_UPLOAD_EXPIRES`: presigned upload lifetime in seconds. Defaults to 300.

Direct browser uploads require an S3 bucket CORS rule for each frontend origin:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["POST"],
    "AllowedOrigins": ["http://localhost:5173", "http://127.0.0.1:5173"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

The origin must exactly match the browser address bar. Add the production
frontend origin before deploying. If the browser reports `Failed to fetch`, also
verify `AWS_S3_REGION_NAME` matches the bucket region because S3 preflight
redirects are blocked by browsers.

## Use AI?

https://huggingface.co/blog/welcome-openai-gpt-oss

## Documentation writing

https://docs.djangoproject.com/en/5.2/internals/contributing/writing-documentation/#:~:text=virtual%20environment%20and%20install%20dependencies

## Cool ideas?

flip book style for recipes?
http://www.turnjs.com/#samples/magazine1/8
