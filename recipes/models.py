# encoding: utf-8
from django.db import models

# Create your models here.
class Recipe(models.Model):
    """
    The recipe on how to make a food dish.
    """
    cuisine = models.CharField(u'Cuisine', max_length=255, blank=False)
    title = models.CharField(u'Recipe Title', max_length=255, blank=False)
    description = models.TextField(blank=True, verbose_name=('Recipe Description'))

    def __str__(self):
        return self.title

    def acceptable_cuisines(self):
        acceptable_cuisines = [
            "Chinese","Japanese","Korean","American","Ethiopian",
            "French", "Spanish", "Mexican", "Vietnamese", "Taiwanese",
            "German", "Portuguese", "Universal"
        ]
        return self.cuisine in acceptable_cuisines

class Ingredient(models.Model):
    """
    Individual ingredients can be in multiple recipes and vice versa
    """
    recipes = models.ManyToManyField(Recipe)
    ingredient_name = models.CharField(u'Ingredient Name', max_length=255)
    amount_needed = models.IntegerField(default=1)
    unit_measurement = models.CharField(u'Measurement Unit', max_length=255)

    def __str__(self):
        return self.ingredient_name

    def acceptable_measurements(self):
        acceptable_measurements = [
            "tablespoon", "teaspoon", "clove", "kilogram", "gram",
            "milligram", "pound(US)", "pinch", "quart", "fluid ounce"
        ]
