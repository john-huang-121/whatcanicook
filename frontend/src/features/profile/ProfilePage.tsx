import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import { LoadingPage } from '../../components/LoadingPage'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { MessagePage } from '../../components/MessagePage'
import { ApiError, apiFetch } from '../../lib/api'
import { uploadToPresignedPost } from '../../lib/presignedUploads'
import type {
  AuthState,
  AvatarUploadSignature,
  Navigate,
  Profile,
  ProfileUpdatePayload,
  SetAuth,
} from '../../types'
import { formatErrors } from '../../utils/formatErrors'

export function ProfilePage({
  auth,
  navigate,
  setAuth,
}: {
  auth: AuthState
  navigate: Navigate
  setAuth: SetAuth
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const avatarPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    if (!auth.authenticated) return
    let active = true

    apiFetch<Profile>('/api/auth/profile/')
      .then((response) => {
        if (!active) return
        setProfile(response)
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })

    return () => {
      active = false
    }
  }, [auth.authenticated])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  if (error && !profile) {
    return <MessagePage title="Profile unavailable" message={error} navigate={navigate} />
  }

  if (!profile || !auth.user) {
    return <LoadingPage message="Loading profile..." />
  }

  const displayName = profile.display_name || auth.user.username
  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  function updateProfile(field: keyof Profile, value: string) {
    setProfile((current) => (current ? { ...current, [field]: value } : current))
  }

  function updateBirthDate(value: dayjs.Dayjs | null) {
    updateProfile('birth_date', value?.isValid() ? value.format('YYYY-MM-DD') : '')
  }

  function selectProfilePicture(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  async function uploadAvatar(selectedFile: File) {
    const contentType = selectedFile.type || 'application/octet-stream'
    const signature = await apiFetch<AvatarUploadSignature>('/api/auth/profile/avatar-upload/', {
      method: 'POST',
      body: {
        filename: selectedFile.name,
        content_type: contentType,
        size: selectedFile.size,
      },
    })

    await uploadToPresignedPost(signature, selectedFile, 'Avatar')
    return signature.profile_picture_key
  }

  function formatProfileError(requestError: unknown) {
    if (requestError instanceof ApiError) {
      return formatErrors(requestError)
    }
    if (requestError instanceof Error) {
      return requestError.message
    }
    return formatErrors(requestError)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const profilePictureKey = file ? await uploadAvatar(file) : undefined
      const body: ProfileUpdatePayload = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        twitter_x_url: profile.twitter_x_url,
        instagram_url: profile.instagram_url,
        facebook_url: profile.facebook_url,
        linkedin_url: profile.linkedin_url,
        birth_date: profile.birth_date || null,
        ...(profilePictureKey ? { profile_picture_key: profilePictureKey } : {}),
      }

      const updatedProfile = await apiFetch<Profile>('/api/auth/profile/', {
        method: 'PATCH',
        body,
      })
      setProfile(updatedProfile)
      setAuth({
        loading: false,
        authenticated: true,
        user: { ...auth.user, profile: updatedProfile },
      })
      setFile(null)
    } catch (requestError) {
      setError(formatProfileError(requestError))
    } finally {
      setSaving(false)
    }
  }

  const avatarImageUrl = avatarPreviewUrl || profile.profile_picture_url

  return (
    <section className="page-band">
      <div className="page-inner narrow">
        <Paper component="section" className="profile-card" elevation={0}>
          <div className="profile-card-header">
            <Avatar alt={displayName} className="profile-avatar profile-avatar-chooser">
              <Button
                aria-label="Choose profile picture"
                className="profile-avatar-button"
                component="label"
              >
                {avatarImageUrl ? (
                  <img className="profile-avatar-image" src={avatarImageUrl} alt="" />
                ) : (
                  <span className="profile-avatar-initials">{avatarInitials}</span>
                )}
                <span className="profile-avatar-backdrop" />
                <span className="profile-avatar-mark">Edit</span>
                <input hidden accept="image/*" type="file" onChange={selectProfilePicture} />
              </Button>
            </Avatar>
            <div>
              <p className="eyebrow">Profile</p>
              <h1>{displayName}</h1>
              <p className="muted">{auth.user.email}</p>
              {file && <p className="muted profile-avatar-selection">{file.name}</p>}
            </div>
          </div>
          {error && <Alert severity="error">{error}</Alert>}
          <form onSubmit={(event) => void submit(event)} className="stacked-form">
            <Divider className="profile-section-divider" textAlign="left">
              Details
            </Divider>
            <div className="form-grid">
              <TextField
                label="First name"
                value={profile.first_name}
                onChange={(event) => updateProfile('first_name', event.target.value)}
              />
              <TextField
                label="Last name"
                value={profile.last_name}
                onChange={(event) => updateProfile('last_name', event.target.value)}
              />
              <DatePicker
                className="profile-date-picker"
                label="Birth date"
                value={profile.birth_date ? dayjs(profile.birth_date) : null}
                onChange={updateBirthDate}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </div>
            <Divider className="profile-section-divider" textAlign="left">
              Social
            </Divider>
            <div className="form-grid">
              <TextField
                label="Twitter/X"
                value={profile.twitter_x_url}
                onChange={(event) => updateProfile('twitter_x_url', event.target.value)}
              />
              <TextField
                label="Instagram"
                value={profile.instagram_url}
                onChange={(event) => updateProfile('instagram_url', event.target.value)}
              />
              <TextField
                label="Facebook"
                value={profile.facebook_url}
                onChange={(event) => updateProfile('facebook_url', event.target.value)}
              />
              <TextField
                label="LinkedIn"
                value={profile.linkedin_url}
                onChange={(event) => updateProfile('linkedin_url', event.target.value)}
              />
            </div>
            <Button type="submit" className="primary-button" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Paper>
      </div>
    </section>
  )
}
