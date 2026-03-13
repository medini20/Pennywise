from django.db import models

class Budget(models.Model):

    category = models.CharField(max_length=100)

    month = models.CharField(max_length=20)

    budget_limit = models.FloatField()

    used_amount = models.FloatField(default=0)