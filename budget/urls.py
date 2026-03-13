from django.urls import path
from . import views

urlpatterns = [

    path('', views.dashboard, name='budget_dashboard'),

    path('set/', views.set_budget, name='set_budget'),

    path('edit/<int:id>/', views.edit_budget, name='edit_budget'),

    path('delete/<int:id>/', views.delete_budget, name='delete_budget'),

]