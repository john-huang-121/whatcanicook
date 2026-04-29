from django.shortcuts import render, redirect

# Create your views here.
def homepage(request):
    if request.user.is_authenticated:
        return redirect('recipes:cuisine_index')
    return render(request, 'splash/homepage.html')