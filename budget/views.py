from django.shortcuts import render, redirect

budgets = []


def budget_dashboard(request):

    return render(request, "budget/budget_dashboard.html", {
        "budgets": budgets
    })


def set_budget(request):

    if request.method == "POST":

        category = request.POST["category"]
        month = request.POST["month"]
        limit = request.POST["limit"]

        budgets.append({
            "category": category,
            "month": month,
            "limit": limit
        })

        return redirect("/budget/")

    return render(request, "budget/set_budget.html")

def edit_budget(request, id):

    budget = budget.objects.get(id=id)

    if request.method == "POST":

        budget.category = request.POST.get("category")
        budget.limit = request.POST.get("limit")
        budget.month = request.POST.get("month")

        budget.save()

        return redirect('/budget/')

    return render(request, "budget/edit_budget.html", {"budget": budget})


def delete_budget(request, id):

    budget = budget.objects.get(id=id)

    budget.delete()

    return redirect('/budget/')