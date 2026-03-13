from django import forms

class BudgetForm(forms.Form):

    category = forms.CharField(label="Category")

    month = forms.CharField(label="Month")

    budget_limit = forms.FloatField(label="Budget Limit")