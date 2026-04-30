from django import forms

from .models import Profile


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "profile_picture",
            "twitter_x_url",
            "instagram_url",
            "facebook_url",
            "linkedin_url",
            "birth_date",
        ]
