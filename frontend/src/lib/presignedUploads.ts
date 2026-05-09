type PresignedPostSignature = {
  upload_url: string
  fields: Record<string, string>
}

export async function uploadToPresignedPost(
  signature: PresignedPostSignature,
  file: File,
  failureLabel: string,
) {
  const uploadBody = new FormData()
  Object.entries(signature.fields).forEach(([key, value]) => {
    uploadBody.append(key, value)
  })
  uploadBody.append('file', file)

  let response: Response
  try {
    response = await fetch(signature.upload_url, {
      method: 'POST',
      body: uploadBody,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `${failureLabel} upload could not reach S3 from ${window.location.origin}. Check the bucket CORS allowed origins and confirm AWS_S3_REGION_NAME matches the bucket region.`,
      )
    }
    throw error
  }

  if (!response.ok) {
    throw new Error(
      `${failureLabel} upload failed with status ${response.status}. Check S3 CORS, bucket region, and upload permissions.`,
    )
  }
}
