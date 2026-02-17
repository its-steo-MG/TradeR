from django.shortcuts import render, redirect
from django.contrib import messages

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username', '').strip().lower()
        password = request.POST.get('password', '').strip()

        if username == 'daniel' and password == 'auma1010':
            request.session['logged_in'] = True
            request.session['user_name'] = 'Daniel Okoth Auma'
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password. Please try again.')

    return render(request, 'accounts/login.html')   # ← use accounts/login.html


def dashboard(request):
    if not request.session.get('logged_in'):
        return redirect('login')

    # Allow changing account number via POST (optional)
    account_number = request.session.get('account_number', '4243142018001601')

    if request.method == 'POST' and 'new_account_number' in request.POST:
        new_number = request.POST.get('new_account_number', '').strip()
        if new_number:
            request.session['account_number'] = new_number
            account_number = new_number

    full_name = request.session.get('user_name', 'Daniel Okoth Auma')
    first_name = full_name.split()[0] if full_name else 'User'   # ← do split here

    context = {
        'user_name': full_name,
        'first_name': first_name,                             # ← add this
        'account_number': account_number,
        'balance': 10_291_000,
        'formatted_balance': f"{10_291_000:,.2f}",
        'currency': 'KES',
    }
    return render(request, 'accounts/dashboard.html', context)

def logout_view(request):
    request.session.flush()
    messages.info(request, 'You have been logged out.')
    return redirect('login')


def transfer_view(request):
    if not request.session.get('logged_in'):
        return redirect('login')
    return render(request, 'accounts/transfer.html')


def statements_view(request):
    if not request.session.get('logged_in'):
        return redirect('login')
    return render(request, 'accounts/statements.html')