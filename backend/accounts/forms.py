from django import forms
from allauth.account.forms import SignupForm

from .models import Profile


class UserSignupForm(SignupForm):
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order_fields(
            ["username", "email", "first_name", "last_name", "password1", "password2"]
        )

    def save(self, request):
        user = super().save(request)
        Profile.objects.update_or_create(
            user=user,
            defaults={
                "first_name": self.cleaned_data["first_name"].strip(),
                "last_name": self.cleaned_data["last_name"].strip(),
            },
        )
        return user


class ProfileForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        input_class = "mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        for field in self.fields.values():
            field.widget.attrs.setdefault("class", input_class)

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
        widgets = {
            "birth_date": forms.DateInput(attrs={"type": "date"}),
        }
