// script.js - Complete file with correct order

// State Management
const AppState = {
    expenses: [],
    categories: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'],
    selectedExpenses: new Set(),
    editingExpenseId: null,
    isSelectionMode: false,
    charts: {},
    chartsInitialized: false,
    touchStartX: null,
    touchStartY: null
};

// Settings
const Settings = {
    reminder: {
        expense: {
            enabled: true,
            interval: 3,
            startTime: '08:00',
            endTime: '20:00',
            activeDays: [0, 1, 2, 3, 4, 5, 6]
        },
        backup: {
            enabled: true,
            time: '19:00',
            frequency: 'daily',
            weekday: 5,
            monthday: 1
        },
        sound: {
            enabled: true,
            volume: 50
        }
    }
};

// Data Management Functions
const loadData = () => {
    try {
        const savedExpenses = localStorage.getItem('expenses');
        const savedCategories = localStorage.getItem('categories');
        const savedSettings = localStorage.getItem('reminderSettings');

        if (savedExpenses) {
            AppState.expenses = JSON.parse(savedExpenses);
        }

        if (savedCategories) {
            AppState.categories = JSON.parse(savedCategories);
        }

        if (savedSettings) {
            Object.assign(Settings.reminder, JSON.parse(savedSettings));
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading saved data. Starting fresh.');
    }
};

const saveData = () => {
    try {
        localStorage.setItem('expenses', JSON.stringify(AppState.expenses));
        localStorage.setItem('categories', JSON.stringify(AppState.categories));
        localStorage.setItem('reminderSettings', JSON.stringify(Settings.reminder));
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data. Please check your browser storage.');
    }
};

// Utility Functions
const setDefaultDate = () => {
    const dateInputs = ['date', 'quickDate', 'dialogDate'];
    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.valueAsDate = new Date();
        }
    });
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
};

const formatDateMobile = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const showNotification = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'var(--success-color)' : 
                     type === 'error' ? 'var(--danger-color)' : 
                     type === 'warning' ? '#f39c12' : 'var(--primary-color)'};
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Expense Management Functions
const openExpenseDialog = (expenseId = null) => {
    const dialog = document.getElementById('expenseDialog');
    const title = document.getElementById('dialogTitle');
    const form = document.getElementById('expenseForm');

    if (expenseId) {
        const expense = AppState.expenses.find(e => e.id === expenseId);
        if (expense) {
            title.textContent = 'Edit Expense';
            document.getElementById('dialogDate').value = expense.date;
            document.getElementById('dialogDescription').value = expense.description;
            document.getElementById('dialogCategory').value = expense.category;
            document.getElementById('dialogAmount').value = expense.amount;
            AppState.editingExpenseId = expenseId;
        }
    } else {
        title.textContent = 'Add Expense';
        form.reset();
        document.getElementById('dialogDate').valueAsDate = new Date();
        AppState.editingExpenseId = null;
    }

    dialog.classList.add('show');
    updateCategorySelects();
};

const closeExpenseDialog = () => {
    document.getElementById('expenseDialog').classList.remove('show');
    document.getElementById('expenseForm').reset();
    AppState.editingExpenseId = null;
};

const handleExpenseSubmit = async (e) => {
    e.preventDefault();

    const expense = {
        id: AppState.editingExpenseId || Date.now(),
        date: document.getElementById('dialogDate').value,
        description: document.getElementById('dialogDescription').value,
        category: document.getElementById('dialogCategory').value,
        amount: parseFloat(document.getElementById('dialogAmount').value)
    };

    if (AppState.editingExpenseId) {
        const index = AppState.expenses.findIndex(e => e.id === AppState.editingExpenseId);
        if (index !== -1) {
            AppState.expenses[index] = expense;
        }
    } else {
        AppState.expenses.push(expense);
    }

    saveData();
    renderExpenses();
    updateStatistics();

    if (AppState.chartsInitialized) {
        updateCharts();
    }

    closeExpenseDialog();
    showNotification(AppState.editingExpenseId ? 'Expense updated!' : 'Expense added!', 'success');
};

const handleQuickAdd = async (e) => {
    e.preventDefault();

    const expense = {
        id: Date.now(),
        date: document.getElementById('quickDate').value,
        description: document.getElementById('quickDescription').value,
        category: document.getElementById('quickCategory').value,
        amount: parseFloat(document.getElementById('quickAmount').value)
    };

    AppState.expenses.push(expense);
    saveData();
    renderExpenses();
    updateStatistics();

    if (AppState.chartsInitialized) {
        updateCharts();
    }

    e.target.reset();
    document.getElementById('quickDate').valueAsDate = new Date();
    showNotification('Expense added!', 'success');
};

const deleteExpense = (id) => {
    if (confirm('Delete this expense?')) {
        AppState.expenses = AppState.expenses.filter(e => e.id !== id);
        saveData();
        renderExpenses();
        updateStatistics();

        if (AppState.chartsInitialized) {
            updateCharts();
        }

        showNotification('Expense deleted!', 'info');
    }
};

const deleteSelected = () => {
    const count = AppState.selectedExpenses.size;
    if (count === 0) {
        showNotification('No expenses selected', 'warning');
        return;
    }

    if (confirm(`Delete ${count} expense${count > 1 ? 's' : ''}?`)) {
        AppState.expenses = AppState.expenses.filter(e => !AppState.selectedExpenses.has(e.id));
        AppState.selectedExpenses.clear();
        saveData();
        renderExpenses();
        updateStatistics();

        if (AppState.chartsInitialized) {
            updateCharts();
        }

        disableSelectionMode();
        showNotification(`${count} expense${count > 1 ? 's' : ''} deleted!`, 'info');
    }
};

// Expense Rendering
const renderExpenses = (filteredExpenses = null) => {
    const expenseList = document.getElementById('expenseList');
    const expensesToRender = filteredExpenses || AppState.expenses;

    const sorted = [...expensesToRender].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        expenseList.innerHTML = '<div class="empty-state">No expenses yet. Add your first expense!</div>';
        document.getElementById('totalAmount').textContent = '$0.00';
        return;
    }

    expenseList.innerHTML = sorted.map(expense => {
        const isSelected = AppState.selectedExpenses.has(expense.id);
        const showCheckbox = AppState.isSelectionMode || isSelected;

        const dateFormatted = window.innerWidth < 480 
            ? formatDateMobile(expense.date)
            : formatDate(expense.date);

        return `
            <div class="expense-item ${isSelected ? 'selected' : ''} ${showCheckbox ? 'show-checkbox' : ''}" 
                 data-id="${expense.id}">
                <input type="checkbox" 
                       class="expense-checkbox" 
                       ${isSelected ? 'checked' : ''}
                       onchange="toggleExpenseSelection(${expense.id})">
                <div class="expense-content">
                    <div class="expense-header">
                        <span class="expense-description">${escapeHtml(expense.description)}</span>
                        <span class="expense-amount">
${expense.amount.toFixed(2)}</span>
                    </div>
                    <div class="expense-footer">
                        <div class="expense-meta">
                            <span class="expense-category">${expense.category}</span>
                            <span class="expense-date">${dateFormatted}</span>
                        </div>
                        <div class="expense-actions">
                            ${window.innerWidth < 480 ? `
                                <button class="icon-btn" onclick="openExpenseDialog(${expense.id})" title="Edit">✏️</button>
                                <button class="icon-btn" onclick="deleteExpense(${expense.id})" title="Delete">🗑️</button>
                            ` : `
                                <button class="btn-edit" onclick="openExpenseDialog(${expense.id})">Edit</button>
                                <button class="btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const total = sorted.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('totalAmount').textContent = '$' + total.toFixed(2);
};

// Selection Mode Functions
const toggleSelectMode = () => {
    if (AppState.isSelectionMode) {
        disableSelectionMode();
    } else {
        enableSelectionMode();
    }
};

const enableSelectionMode = () => {
    AppState.isSelectionMode = true;
    document.getElementById('selectAllBtn').textContent = 'Cancel';
    document.getElementById('bulkActions').classList.add('show');
    document.querySelectorAll('.expense-item').forEach(item => {
        item.classList.add('show-checkbox');
    });
};

const disableSelectionMode = () => {
    AppState.isSelectionMode = false;
    AppState.selectedExpenses.clear();
    document.getElementById('selectAllBtn').textContent = 'Select';
    document.getElementById('bulkActions').classList.remove('show');
    document.querySelectorAll('.expense-item').forEach(item => {
        item.classList.remove('show-checkbox', 'selected');
    });
    document.querySelectorAll('.expense-checkbox').forEach(cb => {
        cb.checked = false;
    });
};

const toggleExpenseSelection = (id) => {
    if (AppState.selectedExpenses.has(id)) {
        AppState.selectedExpenses.delete(id);
    } else {
        AppState.selectedExpenses.add(id);
    }

    const item = document.querySelector(`[data-id="${id}"]`);
    item?.classList.toggle('selected');

    if (AppState.selectedExpenses.size > 0) {
        document.getElementById('bulkActions').classList.add('show');
    } else if (!AppState.isSelectionMode) {
        document.getElementById('bulkActions').classList.remove('show');
    }
};

const cancelSelection = () => {
    disableSelectionMode();
};

// Filter Functions
const toggleFilters = () => {
    const filterContent = document.getElementById('filterContent');
    const icon = document.querySelector('.filter-toggle-icon');

    filterContent.classList.toggle('expanded');
    icon.textContent = filterContent.classList.contains('expanded') ? '▲' : '▼';
};

const quickFilter = (type) => {
    const today = new Date();
    let filtered = AppState.expenses;

    switch(type) {
        case 'today':
            filtered = AppState.expenses.filter(e => 
                e.date === today.toISOString().split('T')[0]
            );
            break;
        case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = AppState.expenses.filter(e => 
                new Date(e.date) >= weekAgo
            );
            break;
        case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            filtered = AppState.expenses.filter(e => 
                new Date(e.date) >= monthAgo
            );
            break;
        case 'all':
            filtered = AppState.expenses;
            break;
    }

    renderExpenses(filtered);

    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
};

const applyFilters = () => {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const category = document.getElementById('filterCategory').value;

    let filtered = AppState.expenses;

    if (fromDate) {
        filtered = filtered.filter(e => e.date >= fromDate);
    }

    if (toDate) {
        filtered = filtered.filter(e => e.date <= toDate);
    }

    if (category) {
        filtered = filtered.filter(e => e.category === category);
    }

    renderExpenses(filtered);
};

// Category Management Functions
const showCategoryDialog = () => {
    document.getElementById('categoryDialog').classList.add('show');
    renderCategories();
};

const closeCategoryDialog = () => {
    document.getElementById('categoryDialog').classList.remove('show');
};

const renderCategories = () => {
	const categoryList = document.getElementById('categoryList');

    categoryList.innerHTML = AppState.categories.map((cat, index) => `
        <div class="category-item">
            <span>${cat}</span>
            <div class="category-actions">
                <button class="btn-text" onclick="editCategory(${index})">Edit</button>
                <button class="btn-danger" onclick="deleteCategory(${index})">Delete</button>
            </div>
        </div>
    `).join('');
};

const addCategory = () => {
    const input = document.getElementById('newCategory');
    const newCategory = input.value.trim();

    if (!newCategory) {
        showNotification('Enter a category name', 'warning');
        return;
    }

    if (AppState.categories.includes(newCategory)) {
        showNotification('Category already exists', 'warning');
        return;
    }

    AppState.categories.push(newCategory);
    saveData();
    updateCategorySelects();
    renderCategories();
    input.value = '';
    showNotification('Category added!', 'success');
};

const editCategory = (index) => {
    const oldName = AppState.categories[index];
    const newName = prompt('Enter new name:', oldName);

    if (newName && newName.trim() && newName !== oldName) {
        if (AppState.categories.includes(newName.trim())) {
            showNotification('Category already exists', 'warning');
            return;
        }

        AppState.categories[index] = newName.trim();

        AppState.expenses.forEach(expense => {
            if (expense.category === oldName) {
                expense.category = newName.trim();
            }
        });

        saveData();
        updateCategorySelects();
        renderCategories();
        renderExpenses();

        if (AppState.chartsInitialized) {
            updateCharts();
        }

        showNotification('Category updated!', 'success');
    }
};

const deleteCategory = (index) => {
    const categoryName = AppState.categories[index];
    const expensesWithCategory = AppState.expenses.filter(e => e.category === categoryName).length;

    let confirmMessage = `Delete "${categoryName}"?`;
    if (expensesWithCategory > 0) {
        confirmMessage += `\n\n${expensesWithCategory} expense(s) will be set to "Uncategorized".`;
    }

    if (confirm(confirmMessage)) {
        AppState.categories.splice(index, 1);

        AppState.expenses.forEach(expense => {
            if (expense.category === categoryName) {
                expense.category = 'Uncategorized';
            }
        });

        if (!AppState.categories.includes('Uncategorized')) {
            AppState.categories.push('Uncategorized');
        }

        saveData();
        updateCategorySelects();
        renderCategories();
        renderExpenses();

        if (AppState.chartsInitialized) {
            updateCharts();
        }

        showNotification('Category deleted!', 'info');
    }
};

const updateCategorySelects = () => {
    const selects = ['category', 'quickCategory', 'dialogCategory', 'filterCategory'];

    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            const isFilter = id === 'filterCategory';

            select.innerHTML = (isFilter ? '<option value="">All Categories</option>' : '<option value="">Select category</option>') +
                AppState.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

            if (currentValue && AppState.categories.includes(currentValue)) {
                select.value = currentValue;
            }
        }
    });
};

// Statistics Functions
const calculateStatistics = () => {
    const totalExpenses = AppState.expenses.length;
    const totalAmount = AppState.expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals = {};
    AppState.expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    let highestCategory = '';
    let highestAmount = 0;
    Object.entries(categoryTotals).forEach(([category, amount]) => {
        if (amount > highestAmount) {
            highestAmount = amount;
            highestCategory = category;
        }
    });

    const avgExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTotal = AppState.expenses
        .filter(e => e.date.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.amount, 0);

    return {
        totalExpenses,
        totalAmount,
        avgExpense,
        monthTotal,
        highestCategory,
        categoryTotals
    };
};

const updateStatistics = () => {
    const statsGrid = document.getElementById('statsGrid');

    const stats = calculateStatistics();

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.totalExpenses}</div>
            <div class="stat-label">Total Expenses</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
            <div class="stat-value">${stats.totalAmount.toFixed(2)}</div>
            <div class="stat-label">Total Spent</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #27ae60, #229954);">
            <div class="stat-value">${stats.avgExpense.toFixed(2)}</div>
            <div class="stat-label">Average</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f39c12, #e67e22);">
            <div class="stat-value">${stats.monthTotal.toFixed(2)}</div>
            <div class="stat-label">This Month</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
            <div class="stat-value">${stats.highestCategory || 'N/A'}</div>
            <div class="stat-label">Top Category</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #34495e, #2c3e50);">
            <div class="stat-value">${AppState.categories.length}</div>
            <div class="stat-label">Categories</div>
        </div>
    `;
};

// Chart Functions
const initializeCharts = () => {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    font: {
                        size: 12
                    }
                }
            }
        }
    };

    const pieCtx = document.getElementById('categoryPieChart').getContext('2d');
    AppState.charts.categoryPie = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                    '#9966FF', '#FF9F40', '#FF6B6B', '#C9CBCF'
                ]
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    font: { size: 16 }
                }
            }
        }
    });

    const barCtx = document.getElementById('categoryBarChart').getContext('2d');
    AppState.charts.categoryBar = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount',
                data: [],
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Spending by Category',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
							return '$' + value.toFixed(0);
						}
                    }
                }
            }
        }
    });

    const monthlyCtx = document.getElementById('monthlyTrendChart').getContext('2d');
    AppState.charts.monthlyTrend = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Monthly Spending',
                data: [],
                borderColor: '#FF6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Monthly Spending Trend',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
							return '$' + value.toFixed(0);
						}
                    }
                }
            }
        }
    });

    const dailyCtx = document.getElementById('dailyTrendChart').getContext('2d');
    AppState.charts.dailyTrend = new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Spending',
                data: [],
                borderColor: '#4BC0C0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Daily Spending (Last 30 Days)',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
							return '$' + value.toFixed(0);
						}
                    }
                }
            }
        }
    });

    const categoryTrendCtx = document.getElementById('categoryTrendChart').getContext('2d');
    AppState.charts.categoryTrend = new Chart(categoryTrendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Category Spending Trends',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
							return '$' + value.toFixed(0);
						}
                    }
                }
            }
        }
    });

    const monthComparisonCtx = document.getElementById('monthComparisonChart').getContext('2d');
    AppState.charts.monthComparison = new Chart(monthComparisonCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'This Month',
                data: [],
                backgroundColor: '#36A2EB'
            }, {
                label: 'Last Month',
                data: [],
                backgroundColor: '#FF6384'
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'This Month vs Last Month',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
							return '$' + value.toFixed(0);
						}
                    }
                }
            }
        }
    });

    const topExpensesCtx = document.getElementById('topExpensesChart').getContext('2d');
    AppState.charts.topExpenses = new Chart(topExpensesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount',
                data: [],
                backgroundColor: '#9966FF'
            }]
        },
        options: {
            ...chartOptions,
            indexAxis: 'y',
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: true,
                    text: 'Top 10 Expenses',
                    font: { size: 16 }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
							return '$' + value.toFixed(0);
						}
                    }
                }
            }
        }
    });
};

const updateCharts = () => {
    if (AppState.expenses.length === 0) return;

    const stats = calculateStatistics();
    const categoryLabels = Object.keys(stats.categoryTotals);
    const categoryData = Object.values(stats.categoryTotals);

    AppState.charts.categoryPie.data.labels = categoryLabels;
    AppState.charts.categoryPie.data.datasets[0].data = categoryData;
    AppState.charts.categoryPie.update();

    AppState.charts.categoryBar.data.labels = categoryLabels;
    AppState.charts.categoryBar.data.datasets[0].data = categoryData;
    AppState.charts.categoryBar.update();

    updateMonthlyTrend();
    updateDailyTrend();
    updateCategoryTrend();
    updateMonthComparison();
    updateTopExpenses();
};

const updateMonthlyTrend = () => {
    const monthlyData = {};
    AppState.expenses.forEach(expense => {
        const month = expense.date.substring(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + expense.amount;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    AppState.charts.monthlyTrend.data.labels = labels;
    AppState.charts.monthlyTrend.data.datasets[0].data = sortedMonths.map(month => monthlyData[month]);
    AppState.charts.monthlyTrend.update();
};

const updateDailyTrend = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyData = {};

    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyData[dateStr] = 0;
    }

    AppState.expenses.forEach(expense => {
        if (expense.date >= thirtyDaysAgo.toISOString().split('T')[0]) {
            if (dailyData.hasOwnProperty(expense.date)) {
                dailyData[expense.date] += expense.amount;
            }
        }
    });

    const labels = Object.keys(dailyData).map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    AppState.charts.dailyTrend.data.labels = labels;
    AppState.charts.dailyTrend.data.datasets[0].data = Object.values(dailyData);
    AppState.charts.dailyTrend.update();
};

const updateCategoryTrend = () => {
    const monthlyCategories = {};

    AppState.expenses.forEach(expense => {
        const month = expense.date.substring(0, 7);
        if (!monthlyCategories[month]) {
            monthlyCategories[month] = {};
        }
        monthlyCategories[month][expense.category] = 
            (monthlyCategories[month][expense.category] || 0) + expense.amount;
    });

    const months = Object.keys(monthlyCategories).sort().slice(-6);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    const categoryTotals = {};
    AppState.expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([category]) => category);

    const datasets = topCategories.map((category, index) => ({
        label: category,
        data: months.map(month => monthlyCategories[month]?.[category] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.1
    }));

    AppState.charts.categoryTrend.data.labels = months.map(month => {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    AppState.charts.categoryTrend.data.datasets = datasets;
    AppState.charts.categoryTrend.update();
};

const updateMonthComparison = () => {
    const today = new Date();
    const thisMonth = today.toISOString().substring(0, 7);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().substring(0, 7);

    const thisMonthByCategory = {};
    const lastMonthByCategory = {};

    AppState.expenses.forEach(expense => {
        if (expense.date.startsWith(thisMonth)) {
            thisMonthByCategory[expense.category] = 
                (thisMonthByCategory[expense.category] || 0) + expense.amount;
        } else if (expense.date.startsWith(lastMonth)) {
            lastMonthByCategory[expense.category] = 
                (lastMonthByCategory[expense.category] || 0) + expense.amount;
        }
    });

    const allCategories = [...new Set([
        ...Object.keys(thisMonthByCategory),
        ...Object.keys(lastMonthByCategory)
    ])];

    AppState.charts.monthComparison.data.labels = allCategories;
    AppState.charts.monthComparison.data.datasets[0].data = allCategories.map(cat => thisMonthByCategory[cat] || 0);
    AppState.charts.monthComparison.data.datasets[1].data = allCategories.map(cat => lastMonthByCategory[cat] || 0);
    AppState.charts.monthComparison.update();
};

const updateTopExpenses = () => {
    const topExpenses = [...AppState.expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    AppState.charts.topExpenses.data.labels = topExpenses.map(e => 
        e.description.length > 30 ? e.description.substring(0, 30) + '...' : e.description
    );
    AppState.charts.topExpenses.data.datasets[0].data = topExpenses.map(e => e.amount);
    AppState.charts.topExpenses.update();
};

// Import/Export Functions
const showImportExportDialog = () => {
    document.getElementById('importExportDialog').classList.add('show');
};

const closeImportExportDialog = () => {
    document.getElementById('importExportDialog').classList.remove('show');
};

const exportToJSON = () => {
    if (AppState.expenses.length === 0 && !confirm('No expenses to export. Export settings only?')) {
        return;
    }

    const data = {
        expenses: AppState.expenses,
        categories: AppState.categories,
        reminderSettings: Settings.reminder,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Data exported successfully!', 'success');
};

const exportToCSV = () => {
    if (AppState.expenses.length === 0) {
        showNotification('No expenses to export', 'warning');
        return;
    }

    let csv = 'Date,Description,Category,Amount\n';
    AppState.expenses.forEach(expense => {
        csv += `${expense.date},"${expense.description}","${expense.category}",${expense.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Data exported as CSV!', 'success');
};

const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileType = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
        try {
            if (fileType === 'json') {
                const data = JSON.parse(e.target.result);

                if (data.expenses) {
                    AppState.expenses = data.expenses;
                }
                if (data.categories) {
                    AppState.categories = data.categories;
                }
                if (data.reminderSettings) {
                    Object.assign(Settings.reminder, data.reminderSettings);
                }
            } else if (fileType === 'csv') {
                const lines = e.target.result.split('\n');
                const newExpenses = [];

                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const [date, description, category, amount] = parseCSVLine(lines[i]);
                        newExpenses.push({
                            id: Date.now() + i,
                            date: date,
                            description: description.replace(/"/g, ''),
                            category: category.replace(/"/g, ''),
                            amount: parseFloat(amount)
                        });
                    }
                }

                AppState.expenses = [...AppState.expenses, ...newExpenses];

                newExpenses.forEach(expense => {
                    if (!AppState.categories.includes(expense.category)) {
                        AppState.categories.push(expense.category);
                    }
                });
            }

            saveData();
            updateCategorySelects();
            renderExpenses();
            updateStatistics();

            if (AppState.chartsInitialized) {
                updateCharts();
            }

            showNotification('Data imported successfully!', 'success');
            closeImportExportDialog();
        } catch (error) {
            showNotification('Error importing data: ' + error.message, 'error');
        }
    };

    reader.readAsText(file);
    event.target.value = '';
};

const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

const clearAllData = () => {
    if (confirm('Delete all expenses and reset categories? This cannot be undone!')) {
        if (confirm('Are you absolutely sure? All data will be lost!')) {
            AppState.expenses = [];
            AppState.categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'];
            AppState.selectedExpenses.clear();

            saveData();
            updateCategorySelects();
            renderExpenses();
            updateStatistics();

            if (AppState.chartsInitialized) {
                updateCharts();
            }

            disableSelectionMode();
            showNotification('All data cleared!', 'info');
        }
    }
};

// Reminder Functions
const initializeReminders = () => {
    // Just load settings from storage, don't update UI yet
    const saved = localStorage.getItem('reminderSettings');
    if (saved) {
        Object.assign(Settings.reminder, JSON.parse(saved));
    }

    if (Settings.reminder.expense.enabled) {
        setInterval(checkExpenseReminder, 60000);
    }

    if (Settings.reminder.backup.enabled) {
        scheduleBackupReminder();
    }
};

const loadReminderSettings = () => {
    const saved = localStorage.getItem('reminderSettings');
    if (saved) {
        Object.assign(Settings.reminder, JSON.parse(saved));
    }

    // Only update UI if the elements exist
    if (document.getElementById('expenseRemindersEnabled')) {
        updateReminderSettingsUI();
    }
};

const updateReminderSettingsUI = () => {
    // Check if elements exist before trying to update them
    const expenseEnabled = document.getElementById('expenseRemindersEnabled');
    if (expenseEnabled) {
        expenseEnabled.checked = Settings.reminder.expense.enabled;
        const expenseOptions = document.getElementById('expenseReminderOptions');
        if (expenseOptions) {
            expenseOptions.style.display = Settings.reminder.expense.enabled ? 'block' : 'none';
        }
    }

    const backupEnabled = document.getElementById('backupRemindersEnabled');
    if (backupEnabled) {
        backupEnabled.checked = Settings.reminder.backup.enabled;
        const backupOptions = document.getElementById('backupReminderOptions');
        if (backupOptions) {
            backupOptions.style.display = Settings.reminder.backup.enabled ? 'block' : 'none';
        }
    }

    // Check each element exists before setting its value
    const reminderInterval = document.getElementById('reminderInterval');
    if (reminderInterval) {
        reminderInterval.value = Settings.reminder.expense.interval;
    }

    const reminderStartTime = document.getElementById('reminderStartTime');
    if (reminderStartTime) {
        reminderStartTime.value = Settings.reminder.expense.startTime;
    }

    const reminderEndTime = document.getElementById('reminderEndTime');
    if (reminderEndTime) {
        reminderEndTime.value = Settings.reminder.expense.endTime;
    }

    // Update reminder days checkboxes
    document.querySelectorAll('input[name="reminderDays"]').forEach(cb => {
        cb.checked = Settings.reminder.expense.activeDays.includes(parseInt(cb.value));
    });

    // Update backup settings
    const backupReminderTime = document.getElementById('backupReminderTime');
    if (backupReminderTime) {
        backupReminderTime.value = Settings.reminder.backup.time;
    }

    const backupFrequency = document.getElementById('backupFrequency');
    if (backupFrequency) {
        backupFrequency.value = Settings.reminder.backup.frequency;
    }

    const backupWeekday = document.getElementById('backupWeekday');
    if (backupWeekday) {
        backupWeekday.value = Settings.reminder.backup.weekday;
    }

    const backupMonthday = document.getElementById('backupMonthday');
    if (backupMonthday) {
        backupMonthday.value = Settings.reminder.backup.monthday;
    }

    // Update sound settings
    const soundEnabled = document.getElementById('soundEnabled');
    if (soundEnabled) {
        soundEnabled.checked = Settings.reminder.sound.enabled;
    }

    const soundVolume = document.getElementById('soundVolume');
    if (soundVolume) {
        soundVolume.value = Settings.reminder.sound.volume;
    }

    const volumeDisplay = document.getElementById('volumeDisplay');
    if (volumeDisplay) {
        volumeDisplay.textContent = Settings.reminder.sound.volume + '%';
    }

    // Update backup frequency options
    updateBackupFrequencyOptions();
};

const checkExpenseReminder = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    if (!Settings.reminder.expense.activeDays.includes(currentDay)) return;
    if (currentTime < Settings.reminder.expense.startTime || currentTime >= Settings.reminder.expense.endTime) return;

    const lastReminder = localStorage.getItem('lastExpenseReminder');
    const lastReminderTime = lastReminder ? new Date(lastReminder) : new Date(0);
    const timeSinceLastReminder = now - lastReminderTime;
    const intervalMs = Settings.reminder.expense.interval * 60 * 60 * 1000;

    if (timeSinceLastReminder >= intervalMs) {
        showReminder('expense');
        localStorage.setItem('lastExpenseReminder', now.toISOString());
    }
};

const scheduleBackupReminder = () => {
    const now = new Date();
    const scheduled = getNextBackupTime();
    const timeUntilReminder = scheduled - now;

    if (timeUntilReminder > 0) {
        setTimeout(() => {
            showReminder('backup');
            scheduleBackupReminder();
        }, timeUntilReminder);
    }
};

const getNextBackupTime = () => {
    const now = new Date();
    const [hours, minutes] = Settings.reminder.backup.time.split(':').map(Number);
    let scheduled = new Date();
    scheduled.setHours(hours, minutes, 0, 0);

    switch (Settings.reminder.backup.frequency) {
        case 'daily':
            if (now > scheduled) {
                scheduled.setDate(scheduled.getDate() + 1);
            }
            break;

        case 'weekly':
            const targetDay = Settings.reminder.backup.weekday;
            const currentDay = scheduled.getDay();
            let daysUntilTarget = targetDay - currentDay;

            if (daysUntilTarget < 0 || (daysUntilTarget === 0 && now > scheduled)) {
                daysUntilTarget += 7;
            }

            scheduled.setDate(scheduled.getDate() + daysUntilTarget);
            break;

        case 'monthly':
            const targetDate = Settings.reminder.backup.monthday;

            if (targetDate === 'last') {
                scheduled = new Date(scheduled.getFullYear(), scheduled.getMonth() + 1, 0);
                scheduled.setHours(hours, minutes, 0, 0);
            } else {
                scheduled.setDate(targetDate);
            }

            if (now > scheduled)
			{
                scheduled.setMonth(scheduled.getMonth() + 1);

                if (targetDate === 'last') {
                    scheduled = new Date(scheduled.getFullYear(), scheduled.getMonth() + 1, 0);
                    scheduled.setHours(hours, minutes, 0, 0);
                }
            }
            break;
    }

    return scheduled;
};

const showReminder = (type) => {
    const notification = document.getElementById('reminderNotification');
    const title = document.getElementById('reminderTitle');
    const message = document.getElementById('reminderMessage');
    const icon = document.getElementById('reminderIcon');

    if (type === 'expense') {
        title.textContent = 'Expense Reminder';
        message.textContent = 'Time to log your recent expenses!';
        icon.textContent = '💰';
        notification.style.background = 'var(--primary-color)';
    } else if (type === 'backup') {
        title.textContent = 'Backup Reminder';
        message.textContent = 'Don\'t forget to backup your expense data!';
        icon.textContent = '💾';
        notification.style.background = 'var(--success-color)';
    }

    notification.classList.add('show');
    playReminderSound();

    setTimeout(() => {
        if (notification.classList.contains('show')) {
            dismissReminder();
        }
    }, 30000);
};

const dismissReminder = () => {
    document.getElementById('reminderNotification').classList.remove('show');
};

const playReminderSound = () => {
    if (!Settings.reminder.sound.enabled) return;

    const audio = document.getElementById('reminderSound');
    audio.volume = Settings.reminder.sound.volume / 100;

    audio.play().catch(() => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3 * (Settings.reminder.sound.volume / 100);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (err) {
            console.log('Audio playback failed:', err);
        }
    });
};

// Settings Functions
const saveReminderSettings = () => {
    Settings.reminder.expense.enabled = document.getElementById('expenseRemindersEnabled')?.checked || false;
    Settings.reminder.expense.interval = parseInt(document.getElementById('reminderInterval')?.value || 3);
    Settings.reminder.expense.startTime = document.getElementById('reminderStartTime')?.value || '08:00';
    Settings.reminder.expense.endTime = document.getElementById('reminderEndTime')?.value || '20:00';

    document.getElementById('expenseReminderOptions').style.display = 
        Settings.reminder.expense.enabled ? 'block' : 'none';

    Settings.reminder.expense.activeDays = [];
    document.querySelectorAll('input[name="reminderDays"]:checked').forEach(cb => {
        Settings.reminder.expense.activeDays.push(parseInt(cb.value));
    });

    Settings.reminder.backup.enabled = document.getElementById('backupRemindersEnabled')?.checked || false;
    Settings.reminder.backup.time = document.getElementById('backupReminderTime')?.value || '19:00';
    Settings.reminder.backup.frequency = document.getElementById('backupFrequency')?.value || 'daily';
    Settings.reminder.backup.weekday = parseInt(document.getElementById('backupWeekday')?.value || 5);
    Settings.reminder.backup.monthday = document.getElementById('backupMonthday')?.value === 'last' ? 
        'last' : parseInt(document.getElementById('backupMonthday')?.value || 1);

    document.getElementById('backupReminderOptions').style.display = 
        Settings.reminder.backup.enabled ? 'block' : 'none';

    Settings.reminder.sound.enabled = document.getElementById('soundEnabled')?.checked || true;
    Settings.reminder.sound.volume = parseInt(document.getElementById('soundVolume')?.value || 50);

    localStorage.setItem('reminderSettings', JSON.stringify(Settings.reminder));

    showNotification('Settings saved!', 'success');

    initializeReminders();
};

const updateBackupFrequencyOptions = () => {
    const frequency = document.getElementById('backupFrequency')?.value;

    const weeklyOptions = document.getElementById('weeklyBackupOptions');
    const monthlyOptions = document.getElementById('monthlyBackupOptions');

    if (weeklyOptions) weeklyOptions.style.display = frequency === 'weekly' ? 'block' : 'none';
    if (monthlyOptions) monthlyOptions.style.display = frequency === 'monthly' ? 'block' : 'none';

    // Remove the recursive call to saveReminderSettings here
    // It was causing the stack overflow
};

// Tab and UI Management Functions
const switchTab = (tabName) => {
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    if (tabName === 'stats' && AppState.chartsInitialized) {
        setTimeout(() => {
            updateCharts();
            Object.values(AppState.charts).forEach(chart => chart?.resize());
        }, 100);
    }
};

const switchChartTab = (chartName) => {
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.chart === chartName);
    });

    document.querySelectorAll('.chart-section').forEach(section => {
        section.classList.toggle('active', section.id === `${chartName}-charts`);
    });

    setTimeout(() => {
        Object.values(AppState.charts).forEach(chart => chart?.resize());
    }, 100);
};

// Touch and Event Handlers
const detectTouchDevice = () => {
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
};

const setupTouchHandlers = () => {
    const expenseList = document.getElementById('expenseList');

    expenseList.addEventListener('touchstart', (e) => {
        AppState.touchStartX = e.touches[0].clientX;
        AppState.touchStartY = e.touches[0].clientY;
    });

    expenseList.addEventListener('touchend', (e) => {
        if (!AppState.touchStartX || !AppState.touchStartY) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = AppState.touchStartX - touchEndX;
        const diffY = AppState.touchStartY - touchEndY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            const expenseItem = e.target.closest('.expense-item');
            if (expenseItem) {
                const expenseId = parseInt(expenseItem.dataset.id);
                if (diffX > 0) {
                    // Swipe left - show actions
                } else {
                    // Swipe right - hide actions
                }
            }
        }

        AppState.touchStartX = null;
        AppState.touchStartY = null;
    });

    let longPressTimer;
    expenseList.addEventListener('touchstart', (e) => {
        const expenseItem = e.target.closest('.expense-item');
        if (expenseItem) {
            longPressTimer = setTimeout(() => {
                enableSelectionMode();
                expenseItem.classList.add('show-checkbox');
            }, 500);
        }
    });

    expenseList.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });

    expenseList.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
    });
};

const handleKeyboardShortcuts = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        showImportExportDialog();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openExpenseDialog();
    }

    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });

        if (AppState.isSelectionMode) {
            disableSelectionMode();
        }
    }
};

// Event Listener Setup
const setupEventListeners = () => {
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', (e) => switchChartTab(e.target.dataset.chart));
    });

    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('quickAddForm')?.addEventListener('submit', handleQuickAdd);

    if ('ontouchstart' in window) {
        setupTouchHandlers();
    }

    document.addEventListener('keydown', handleKeyboardShortcuts);

    window.addEventListener('resize', debounce(() => {
        if (AppState.chartsInitialized) {
            Object.values(AppState.charts).forEach(chart => chart?.resize());
        }
    }, 250));
};

// Initialize Functions
const initializeApp = () => {
    loadData();
    setDefaultDate();
    updateCategorySelects();
    renderExpenses();
    updateStatistics();
    initializeReminders();

    const statsTab = document.querySelector('[data-tab="stats"]');
    if (statsTab) {
        statsTab.addEventListener('click', () => {
            if (!AppState.chartsInitialized) {
                setTimeout(() => {
                    initializeCharts();
                    updateCharts();
                    AppState.chartsInitialized = true;
                }, 100);
            }
        });
    }
};

// DOM Content Loaded Events
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    detectTouchDevice();
});

// Settings Tab Initialization
document.addEventListener('DOMContentLoaded', () => {
    const settingsTab = document.getElementById('settings-tab');
    if (settingsTab) {
        settingsTab.innerHTML = `
            <div class="card">
                <div class="card-header">Reminder Settings</div>
                <div class="settings-content">
                    <!-- Expense Reminders -->
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: var(--text-primary); margin-bottom: 15px;">Expense Reminders</h3>

                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="expenseRemindersEnabled" checked onchange="saveReminderSettings()">
                                <span>Enable expense reminders</span>
                            </label>
                        </div>

                        <div id="expenseReminderOptions" style="margin-left: 20px; margin-top: 15px;">
                            <div class="form-group">
                                <label>Reminder Interval (hours)</label>
                                <input type="number" id="reminderInterval" min="1" max="24" value="3" onchange="saveReminderSettings()">
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group">
                                    <label>Start Time</label>
                                    <input type="time" id="reminderStartTime" value="08:00" onchange="saveReminderSettings()">
                                </div>
                                <div class="form-group">
                                    <label>End Time</label>
                                    <input type="time" id="reminderEndTime" value="20:00" onchange="saveReminderSettings()">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Active Days</label>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <label><input type="checkbox" name="reminderDays" value="0" checked onchange="saveReminderSettings()"> Sun</label>
                                    <label><input type="checkbox" name="reminderDays" value="1" checked onchange="saveReminderSettings()"> Mon</label>
                                    <label><input type="checkbox" name="reminderDays" value="2" checked onchange="saveReminderSettings()"> Tue</label>
                                    <label><input type="checkbox" name="reminderDays" value="3" checked onchange="saveReminderSettings()"> Wed</label>
                                    <label><input type="checkbox" name="reminderDays" value="4" checked onchange="saveReminderSettings()"> Thu</label>
                                    <label><input type="checkbox" name="reminderDays" value="5" checked onchange="saveReminderSettings()"> Fri</label>
                                    <label><input type="checkbox" name="reminderDays" value="6" checked onchange="saveReminderSettings()"> Sat</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Backup Reminders -->
                    <div style="border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <h3 style="color: var(--text-primary); margin-bottom: 15px;">Backup Reminders</h3>

                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="backupRemindersEnabled" onchange="saveReminderSettings()">
                                <span>Enable backup reminders</span>
                            </label>
                        </div>

                        <div id="backupReminderOptions" style="margin-left: 20px; margin-top: 15px;">
                            <div class="form-group">
                                <label>Reminder Time</label>
                                <input type="time" id="backupReminderTime" value="19:00" onchange="saveReminderSettings()">
                            </div>

                            <div class="form-group">
                                <label>Frequency</label>
                                <select id="backupFrequency" onchange="updateBackupFrequencyOptions()">
                                    <option value="daily">Every Day</option>
                                    <option value="weekly">Once a Week</option>
                                    <option value="monthly">Once a Month</option>
                                </select>
                            </div>

                            <div id="weeklyBackupOptions" style="display: none;" class="form-group">
                                <label>Day of Week</label>
                                <select id="backupWeekday" onchange="saveReminderSettings()">
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                </select>
                            </div>

                            <div id="monthlyBackupOptions" style="display: none;" class="form-group">
                                <label>Day of Month</label>
                                <select id="backupMonthday" onchange="saveReminderSettings()">
                                    ${Array.from({length: 28}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                                    <option value="last">Last day of month</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sound Settings -->
            <div class="card">
                <div class="card-header">Sound Settings</div>
                <div class="settings-content">
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="soundEnabled" checked onchange="saveReminderSettings()">
                            <span>Enable sound notifications</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Volume</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="range" id="soundVolume" min="0" max="100" value="50" onchange="saveReminderSettings()" style="flex: 1;">
                            <span id="volumeDisplay" style="min-width: 45px;">50%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- About -->
            <div class="card">
                <div class="card-header">About</div>
                <div class="settings-content" style="text-align: center;">
                    <p style="margin-bottom: 10px;">Offline Expense Tracker v5.0</p>
                    <p style="color: var(--text-secondary); font-size: 14px;">
                        A privacy-focused, open-source expense tracking app that works entirely offline.
                        Your data never leaves your device.
                    </p>
                    <div style="margin-top: 20px;">
                        <a href="https://github.com/mrnavsingh/offlineexpensetracker" 
                           style="color: var(--primary-color); text-decoration: none;">
                            View on GitHub →
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Load saved settings
        loadReminderSettings();

        // Initialize volume slider
        const volumeSlider = document.getElementById('soundVolume');
        const volumeDisplay = document.getElementById('volumeDisplay');

        if (volumeSlider && volumeDisplay) {
            volumeSlider.addEventListener('input', (e) => {
                volumeDisplay.textContent = e.target.value + '%';
            });
        }
    }
});

// Make functions globally available for onclick handlers
window.openExpenseDialog = openExpenseDialog;
window.closeExpenseDialog = closeExpenseDialog;
window.deleteExpense = deleteExpense;
window.toggleExpenseSelection = toggleExpenseSelection;
window.showCategoryDialog = showCategoryDialog;
window.closeCategoryDialog = closeCategoryDialog;
window.addCategory = addCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.showImportExportDialog = showImportExportDialog;
window.closeImportExportDialog = closeImportExportDialog;
window.exportToJSON = exportToJSON;
window.exportToCSV = exportToCSV;
window.importData = importData;
window.clearAllData = clearAllData;
window.toggleSelectMode = toggleSelectMode;
window.deleteSelected = deleteSelected;
window.cancelSelection = cancelSelection;
window.quickFilter = quickFilter;
window.applyFilters = applyFilters;
window.toggleFilters = toggleFilters;
window.dismissReminder = dismissReminder;
window.saveReminderSettings = saveReminderSettings;
window.updateBackupFrequencyOptions = updateBackupFrequencyOptions;

// Service Worker Registration (for offline functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker registration failed, app will still work without offline caching
        });
    });
}

// Performance optimization: Lazy load charts only when needed
let chartLoadPromise = null;
const ensureChartsLoaded = () => {
    if (!chartLoadPromise && !window.Chart) {
        chartLoadPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
    return chartLoadPromise || Promise.resolve();
};

// Override chart initialization to use lazy loading
const originalInitializeCharts = initializeCharts;
window.initializeCharts = async () => {
    await ensureChartsLoaded();
    originalInitializeCharts();
};

// Mobile-specific optimizations
if ('ontouchstart' in window) {
    // Disable pull-to-refresh on expense list
    const expenseList = document.getElementById('expenseList');
    if (expenseList) {
        let lastY = 0;
        expenseList.addEventListener('touchstart', e => {
            lastY = e.touches[0].clientY;
        });

        expenseList.addEventListener('touchmove', e => {
            const y = e.touches[0].clientY;
            const scrollTop = expenseList.scrollTop;

            if (scrollTop === 0 && y > lastY) {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

// Add CSS for toast notifications and animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
        font-size: 16px;
    }
`;
document.head.appendChild(style);

// Initialize the app
console.log('Offline Expense Tracker initialized successfully!');
