# from django.test import TestCase, Client
# from django.urls import reverse
# from recipes.models import Recipe

# class RecipeViewTests(TestCase):
#     def setUp(self):
#         self.client = Client()
#         self.recipe = Recipe.objects.create(
#             title="Test Recipe",
#             description="Test description",
#             cook_time=10,
#             servings=2,
#             instructions="Test instructions"
#         )

#     def test_index_view_status_code_and_content(self):
#         response = self.client.get(reverse('index'))
#         self.assertEqual(response.status_code, 200)
#         self.assertContains(response, "Test Recipe")

#     def test_detail_view(self):
#         response = self.client.get(reverse('detail', args=[self.recipe.id]))
#         self.assertEqual(response.status_code, 200)
#         # self.assertContains(response, "Test instructions")

#     def test_create_view_valid_post(self):
#         response = self.client.post(reverse('create'), {
#             'title': 'New Recipe',
#             'description': 'Something new',
#             'cook_time': 20,
#             'servings': 4,
#             'instructions': 'Mix well',
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertTrue(Recipe.objects.filter(title='New Recipe').exists())

#     def test_update_view_valid_post(self):
#         response = self.client.post(reverse('update', args=[self.recipe.id]), {
#             'title': 'Updated Title',
#             'description': self.recipe.description,
#             'cook_time': self.recipe.cook_time,
#             'servings': self.recipe.servings,
#             'instructions': self.recipe.instructions,
#         })
#         self.recipe.refresh_from_db()
#         self.assertEqual(self.recipe.title, 'Updated Title')

#     def test_delete_view_post(self):
#         response = self.client.post(reverse('delete', args=[self.recipe.id]))
#         self.assertRedirects(response, '/')
#         self.assertFalse(Recipe.objects.filter(id=self.recipe.id).exists())
