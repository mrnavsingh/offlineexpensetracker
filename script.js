// Data management
let expenses = [];
let categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'];
let sortColumn = 'date';
let sortDirection = 'desc';
let charts = {};
let chartsInitialized = false;
let editingCell = null;

// Reminder variables
let reminderCheckInterval;
let backupReminderTimeout;
let lastExpenseReminder = new Date();
let snoozeCount = 0;

// Add settings object
let reminderSettings = {
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
		weekday: 5, // Friday
		monthday: 1  // 1st of month
	},
	sound: {
		enabled: true,
		volume: 50
	}
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
	loadData();
	setDefaultDate();
	updateCategorySelects();
	displayExpenses();
	updateStatistics();
	initializeReminders();
});

// Initialize reminder system
function initializeReminders() {
	loadReminderSettings();

	// Set up expense reminder check (every minute)
	if (reminderSettings.expense.enabled) {
		reminderCheckInterval = setInterval(checkExpenseReminder, 60000);
	}

	// Set up backup reminder
	if (reminderSettings.backup.enabled) {
		scheduleBackupReminder();
	}

	// Check immediately on load
	checkExpenseReminder();
}

// Check if expense reminder should be shown
function checkExpenseReminder() {
	if (!reminderSettings.expense.enabled) return;

	const now = new Date();
	const currentDay = now.getDay();
	const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

	// Check if today is an active day
	if (!reminderSettings.expense.activeDays.includes(currentDay)) return;

	// Check if within time range
	if (currentTime < reminderSettings.expense.startTime || 
		currentTime >= reminderSettings.expense.endTime) return;

	// Check if enough time has passed
	const timeSinceLastReminder = now - lastExpenseReminder;
	const intervalMs = reminderSettings.expense.interval * 60 * 60 * 1000;

	if (timeSinceLastReminder >= intervalMs) {
		showReminder('expense');
		lastExpenseReminder = now;
	}
}

// Schedule backup reminder for 7pm
function scheduleBackupReminder() {
	if (!reminderSettings.backup.enabled) return;

	clearTimeout(backupReminderTimeout);

	const now = new Date();
	const scheduled = getNextBackupTime();

	const timeUntilReminder = scheduled - now;

	if (timeUntilReminder > 0) {
		backupReminderTimeout = setTimeout(() => {
			showReminder('backup');
			// Schedule next reminder
			scheduleBackupReminder();
		}, timeUntilReminder);
	}
}

// Add new function to calculate next backup time
function getNextBackupTime() {
	const now = new Date();
	const [hours, minutes] = reminderSettings.backup.time.split(':').map(Number);
	let scheduled = new Date();
	scheduled.setHours(hours, minutes, 0, 0);

	switch (reminderSettings.backup.frequency) {
		case 'daily':
			if (now > scheduled) {
				scheduled.setDate(scheduled.getDate() + 1);
			}
			break;

		case 'weekly':
			const targetDay = reminderSettings.backup.weekday;
			const currentDay = scheduled.getDay();
			let daysUntilTarget = targetDay - currentDay;

			if (daysUntilTarget < 0 || (daysUntilTarget === 0 && now > scheduled)) {
				daysUntilTarget += 7;
			}

			scheduled.setDate(scheduled.getDate() + daysUntilTarget);
			break;

		case 'monthly':
			const targetDate = reminderSettings.backup.monthday;

			if (targetDate === 'last') {
				// Set to last day of current month
				scheduled = new Date(scheduled.getFullYear(), scheduled.getMonth() + 1, 0);
				scheduled.setHours(hours, minutes, 0, 0);
			} else {
				scheduled.setDate(targetDate);
			}

			if (now > scheduled) {
				// Move to next month
				scheduled.setMonth(scheduled.getMonth() + 1);

				if (targetDate === 'last') {
					scheduled = new Date(scheduled.getFullYear(), scheduled.getMonth() + 1, 0);
					scheduled.setHours(hours, minutes, 0, 0);
				}
			}
			break;
	}

	return scheduled;
}

// Show reminder notification
function showReminder(type) {
	const notification = document.getElementById('reminderNotification');
	const title = document.getElementById('reminderTitle');
	const message = document.getElementById('reminderMessage');
	const icon = document.getElementById('reminderIcon');

	if (type === 'expense') {
		title.textContent = 'Expense Reminder';
		message.textContent = 'Time to log your expenses from the last 3 hours!';
		icon.textContent = '💰';
		notification.style.background = '#3498db';
	} else if (type === 'backup') {
		title.textContent = 'Backup Reminder';
		message.textContent = 'Time to backup your expense data!';
		icon.textContent = '💾';
		notification.style.background = '#27ae60';
	}

	// Show notification
	notification.style.display = 'block';

	// Play sound
	playReminderSound();

	// Add pulsing animation to tab/window title
	startTitleAlert(title.textContent);

	// Auto-hide after 30 seconds
	setTimeout(() => {
		if (notification.style.display === 'block') {
			dismissReminder();
		}
	}, 30000);
}

// Play reminder sound
function playReminderSound() {
	if (!reminderSettings.sound.enabled) return;
	const audio = document.getElementById('reminderSound');
	audio.volume = reminderSettings.sound.volume / 100;

	// Try to play, handle autoplay restrictions
	audio.play().catch(e => {
		console.log('Audio autoplay prevented:', e);
		// Fallback: Use Web Audio API for a beep
		try {
			const audioContext = new (window.AudioContext || window.webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.frequency.value = 800;
			oscillator.type = 'sine';
			gainNode.gain.value = 0.3;

			oscillator.start();
			oscillator.stop(audioContext.currentTime + 0.2);

			// Second beep
			setTimeout(() => {
				const osc2 = audioContext.createOscillator();
				const gain2 = audioContext.createGain();
				osc2.connect(gain2);
				gain2.connect(audioContext.destination);
				osc2.frequency.value = 800;
				osc2.type = 'sine';
				gain2.gain.value = 0.3;
				osc2.start();
				osc2.stop(audioContext.currentTime + 0.2);
			}, 300);
		} catch (err) {
			console.log('Web Audio API not supported:', err);
		}
	});
}

// Save reminder settings 
function saveReminderSettings() {
	// Gather expense reminder settings
	reminderSettings.expense.enabled = document.getElementById('expenseRemindersEnabled').checked;
	reminderSettings.expense.interval = parseInt(document.getElementById('reminderInterval').value);
	reminderSettings.expense.startTime = document.getElementById('reminderStartTime').value;
	reminderSettings.expense.endTime = document.getElementById('reminderEndTime').value;

	// Gather active days
	reminderSettings.expense.activeDays = [];
	document.querySelectorAll('input[name="reminderDays"]:checked').forEach(cb => {
		reminderSettings.expense.activeDays.push(parseInt(cb.value));
	});

	// Gather backup reminder settings
	reminderSettings.backup.enabled = document.getElementById('backupRemindersEnabled').checked;
	reminderSettings.backup.time = document.getElementById('backupReminderTime').value;
	reminderSettings.backup.frequency = document.getElementById('backupFrequency').value;
	reminderSettings.backup.weekday = parseInt(document.getElementById('backupWeekday').value);
	reminderSettings.backup.monthday = document.getElementById('backupMonthday').value === 'last' ? 
		'last' : parseInt(document.getElementById('backupMonthday').value);

	// Sound settings
	reminderSettings.sound.enabled = document.getElementById('soundEnabled').checked;
	reminderSettings.sound.volume = parseInt(document.getElementById('soundVolume').value);

	// Save to localStorage
	localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));

	// Update UI
	updateReminderUI();

	// Restart reminders with new settings
	clearInterval(reminderCheckInterval);
	clearTimeout(backupReminderTimeout);

	if (reminderSettings.expense.enabled) {
		reminderCheckInterval = setInterval(checkExpenseReminder, 60000);
	}

	if (reminderSettings.backup.enabled) {
		scheduleBackupReminder();
	}
}


// Flash title to get attention
let titleInterval;
const originalTitle = document.title;

function startTitleAlert(reminderType) {
	let isOriginal = true;
	clearInterval(titleInterval);

	titleInterval = setInterval(() => {
		document.title = isOriginal ? `🔔 ${reminderType}!` : originalTitle;
		isOriginal = !isOriginal;
	}, 1000);
}

function stopTitleAlert() {
	clearInterval(titleInterval);
	document.title = originalTitle;
}

// Dismiss reminder
function dismissReminder() {
	document.getElementById('reminderNotification').style.display = 'none';
	stopTitleAlert();
	snoozeCount = 0;
}

// Add snooze functionality
function snoozeReminder(minutes = 10) {
	dismissReminder();
	snoozeCount++;

	setTimeout(() => {
		if (snoozeCount < 3) {
			showReminder('expense');
		}
	}, minutes * 60 * 1000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
	clearInterval(reminderInterval);
	clearTimeout(backupReminderTimeout);
});

// Reminder Settings Management
function toggleExpenseReminders() {
	const enabled = document.getElementById('expenseRemindersEnabled').checked;
	localStorage.setItem('expenseRemindersEnabled', enabled);

	if (!enabled) {
		clearInterval(reminderInterval);
	} else {
		reminderInterval = setInterval(checkExpenseReminder, 60000);
	}
}

// Reminder Settings Management
function toggleBackupReminders() {
	const enabled = document.getElementById('backupRemindersEnabled').checked;
	localStorage.setItem('backupRemindersEnabled', enabled);

	if (!enabled) {
		clearTimeout(backupReminderTimeout);
	} else {
		scheduleBackupReminder();
	}
}

// Reminder Settings Management
// Load settings on init (add to initializeReminders function)
function loadReminderSettings() {
	const saved = localStorage.getItem('reminderSettings');
	if (saved) {
		reminderSettings = JSON.parse(saved);
	}

	// Update UI with loaded settings
	document.getElementById('expenseRemindersEnabled').checked = reminderSettings.expense.enabled;
	document.getElementById('reminderInterval').value = reminderSettings.expense.interval;
	document.getElementById('reminderStartTime').value = reminderSettings.expense.startTime;
	document.getElementById('reminderEndTime').value = reminderSettings.expense.endTime;

	// Set active days
	document.querySelectorAll('input[name="reminderDays"]').forEach(cb => {
		cb.checked = reminderSettings.expense.activeDays.includes(parseInt(cb.value));
	});

	// Backup settings
	document.getElementById('backupRemindersEnabled').checked = reminderSettings.backup.enabled;
	document.getElementById('backupReminderTime').value = reminderSettings.backup.time;
	document.getElementById('backupFrequency').value = reminderSettings.backup.frequency;
	document.getElementById('backupWeekday').value = reminderSettings.backup.weekday;
	document.getElementById('backupMonthday').value = reminderSettings.backup.monthday;

	// Sound settings
	document.getElementById('soundEnabled').checked = reminderSettings.sound.enabled;
	document.getElementById('soundVolume').value = reminderSettings.sound.volume;
	document.getElementById('volumeDisplay').textContent = reminderSettings.sound.volume + '%';

	updateReminderUI();
	updateBackupFrequencyOptions();
}

function updateReminderUI() {
	// Show/hide expense reminder options
	document.getElementById('expenseReminderOptions').style.display = 
		document.getElementById('expenseRemindersEnabled').checked ? 'block' : 'none';

	// Show/hide backup reminder options
	document.getElementById('backupReminderOptions').style.display = 
		document.getElementById('backupRemindersEnabled').checked ? 'block' : 'none';
}

function updateBackupFrequencyOptions() {
	const frequency = document.getElementById('backupFrequency').value;

	document.getElementById('weeklyBackupOptions').style.display = 
		frequency === 'weekly' ? 'block' : 'none';

	document.getElementById('monthlyBackupOptions').style.display = 
		frequency === 'monthly' ? 'block' : 'none';

	saveReminderSettings();
}

// Update volume display
document.getElementById('soundVolume').addEventListener('input', function() {
	document.getElementById('volumeDisplay').textContent = this.value + '%';
});


// Main tab switching
function showMainTab(tabName) {
	// Update tab buttons
	document.querySelectorAll('.main-tab').forEach(tab => {
		tab.classList.remove('active');
	});
	event.target.classList.add('active');

	// Update tab content
	document.querySelectorAll('.main-tab-content').forEach(content => {
		content.classList.remove('active');
	});
	document.getElementById(tabName + '-tab').classList.add('active');

	// Initialize charts when Stats tab is shown for the first time
	if (tabName === 'stats' && !chartsInitialized) {
		setTimeout(() => {
			initializeCharts();
			updateCharts();
			chartsInitialized = true;
		}, 100);
	} else if (tabName === 'stats' && chartsInitialized) {
		// Update charts when returning to stats tab
		setTimeout(() => {
			updateCharts();
			Object.values(charts).forEach(chart => {
				if (chart && chart.resize) {
					chart.resize();
				}
			});
		}, 100);
	}
}

// Set today's date as default
function setDefaultDate() {
	document.getElementById('date').valueAsDate = new Date();
}

// Load data from localStorage
function loadData() {
	const savedExpenses = localStorage.getItem('expenses');
	const savedCategories = localStorage.getItem('categories');

	if (savedExpenses) {
		expenses = JSON.parse(savedExpenses);
	}

	if (savedCategories) {
		categories = JSON.parse(savedCategories);
	}
}

// Save data to localStorage
function saveData() {
	localStorage.setItem('expenses', JSON.stringify(expenses));
	localStorage.setItem('categories', JSON.stringify(categories));
}

// Add expense
document.getElementById('expenseForm').addEventListener('submit', function(e) {
	e.preventDefault();

	const expense = {
		id: Date.now(),
		date: document.getElementById('date').value,
		description: document.getElementById('description').value,
		category: document.getElementById('category').value,
		amount: parseFloat(document.getElementById('amount').value)
	};

	expenses.push(expense);
	saveData();

	// Reset form
	document.getElementById('description').value = '';
	document.getElementById('amount').value = '';

	displayExpenses();
	updateStatistics();
	if (chartsInitialized) {
		updateCharts();
	}

	alert('Expense added successfully!');
});

// Display expenses with edit capability
function displayExpenses(filteredExpenses = null) {
	const tbody = document.getElementById('expenseBody');
	const expensesToDisplay = filteredExpenses || expenses;

	// Sort expenses
	const sorted = [...expensesToDisplay].sort((a, b) => {
		let aVal = a[sortColumn];
		let bVal = b[sortColumn];

		if (sortColumn === 'date') {
			aVal = new Date(aVal);
			bVal = new Date(bVal);
		} else if (sortColumn === 'amount') {
			aVal = parseFloat(aVal);
			bVal = parseFloat(bVal);
		}

		if (sortDirection === 'asc') {
			return aVal > bVal ? 1 : -1;
		} else {
			return aVal < bVal ? 1 : -1;
		}
	});

	tbody.innerHTML = sorted.map(expense => 
		'<tr data-id="' + expense.id + '">' +
			'<td><input type="checkbox" class="expense-checkbox" value="' + expense.id + '"></td>' +
			'<td class="editable-cell" onclick="startEdit(this, ' + expense.id + ', \'date\')">' + 
				expense.date + '<span class="edit-icon">✏️</span></td>' +
			'<td class="editable-cell" onclick="startEdit(this, ' + expense.id + ', \'description\')">' + 
				expense.description + '<span class="edit-icon">✏️</span></td>' +
			'<td class="editable-cell" onclick="startEdit(this, ' + expense.id + ', \'category\')">' + 
				expense.category + '<span class="edit-icon">✏️</span></td>' +
			'<td class="editable-cell amount" onclick="startEdit(this, ' + expense.id + ', \'amount\')">$' + 
				expense.amount.toFixed(2) + '<span class="edit-icon">✏️</span></td>' +
			'<td>' +
				'<button class="danger" style="padding: 5px 10px; font-size: 12px;" onclick="deleteExpense(' + expense.id + ')">Delete</button>' +
			'</td>' +
		'</tr>'
	).join('');

	// Update total
	const total = sorted.reduce((sum, expense) => sum + expense.amount, 0);
	document.getElementById('totalAmount').textContent = 'Total: $' + total.toFixed(2);

	// Add checkbox event listeners
	document.querySelectorAll('.expense-checkbox').forEach(checkbox => {
		checkbox.addEventListener('change', updateSelectedRows);
	});
}

// Start editing a cell
function startEdit(cell, expenseId, field) {
	// Cancel any existing edit
	if (editingCell) {
		cancelEdit();
	}

	editingCell = { cell, expenseId, field };
	const expense = expenses.find(e => e.id === expenseId);
	const currentValue = expense[field];

	let inputHTML = '';
	if (field === 'date') {
		inputHTML = '<input type="date" class="edit-input" value="' + currentValue + '">';
	} else if (field === 'category') {
		inputHTML = '<select class="edit-input">' +
			categories.map(cat => 
				'<option value="' + cat + '"' + (cat === currentValue ? ' selected' : '') + '>' + 
				cat + '</option>'
			).join('') +
			'</select>';
	} else if (field === 'amount') {
		inputHTML = '<input type="number" class="edit-input" step="0.01" min="0.01" value="' + currentValue + '">';
	} else {
		inputHTML = '<input type="text" class="edit-input" value="' + currentValue + '">';
	}

	cell.innerHTML = inputHTML + 
		'<div class="edit-actions">' +
			'<button class="success" onclick="saveEdit()">✓</button>' +
			'<button class="danger" onclick="cancelEdit()">✗</button>' +
		'</div>';

	// Focus the input
	const input = cell.querySelector('.edit-input');
	input.focus();
	if (input.select) {
		input.select();
	}

	// Add keyboard event listeners
	input.addEventListener('keydown', function(e) {
		if (e.key === 'Enter') {
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	});

	// Prevent click propagation
	cell.onclick = null;
}

// Save the edit
function saveEdit() {
	if (!editingCell) return;

	const { cell, expenseId, field } = editingCell;
	const input = cell.querySelector('.edit-input');
	let newValue = input.value;

	// Validate
	if (!newValue || newValue.trim() === '') {
		alert('Value cannot be empty');
		return;
	}

	if (field === 'amount') {
		newValue = parseFloat(newValue);
		if (isNaN(newValue) || newValue <= 0) {
			alert('Please enter a valid amount');
			return;
		}
	}

	// Update the expense
	const expense = expenses.find(e => e.id === expenseId);
	if (expense) {
		expense[field] = newValue;
		saveData();
		displayExpenses();
		updateStatistics();
		if (chartsInitialized) {
			updateCharts();
		}
	}

	editingCell = null;
}

// Cancel editing
function cancelEdit() {
	if (!editingCell) return;
	displayExpenses();
	editingCell = null;
}

// Update selected rows visual feedback
function updateSelectedRows() {
	document.querySelectorAll('#expenseBody tr').forEach(row => {
		const checkbox = row.querySelector('.expense-checkbox');
		if (checkbox && checkbox.checked) {
			row.classList.add('selected-row');
		} else {
			row.classList.remove('selected-row');
		}
	});
}

// Toggle select all
function toggleSelectAll() {
	const selectAll = document.getElementById('selectAll');
	const checkboxes = document.querySelectorAll('.expense-checkbox');

	checkboxes.forEach(checkbox => {
		checkbox.checked = selectAll.checked;
	});

	updateSelectedRows();
}

// Sort expenses
function sortExpenses(column) {
	if (sortColumn === column) {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	} else {
		sortColumn = column;
		sortDirection = 'desc';
	}
	displayExpenses();
}

// Delete expense
function deleteExpense(id) {
	if (confirm('Are you sure you want to delete this expense?')) {
		expenses = expenses.filter(expense => expense.id !== id);
		saveData();
		displayExpenses();
		updateStatistics();
		if (chartsInitialized) {
			updateCharts();
		}
	}
}

// Delete selected expenses
function deleteSelected() {
	const selected = Array.from(document.querySelectorAll('.expense-checkbox:checked'))
		.map(checkbox => parseInt(checkbox.value));

	if (selected.length === 0) {
		alert('Please select expenses to delete');
		return;
	}

	if (confirm(`Are you sure you want to delete ${selected.length} expense(s)?`)) {
		expenses = expenses.filter(expense => !selected.includes(expense.id));
		saveData();
		displayExpenses();
		updateStatistics();
		if (chartsInitialized) {
			updateCharts();
		}
		document.getElementById('selectAll').checked = false;
	}
}

// Quick filters
function quickFilter(type) {
	const today = new Date();
	let filtered = expenses;

	switch(type) {
		case 'today':
			filtered = expenses.filter(expense => 
				expense.date === today.toISOString().split('T')[0]
			);
			break;
		case 'week':
			const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
			filtered = expenses.filter(expense => 
				new Date(expense.date) >= weekAgo
			);
			break;
		case 'month':
			const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
			filtered = expenses.filter(expense => 
				new Date(expense.date) >= monthAgo
			);
			break;
		case 'all':
			filtered = expenses;
			break;
	}

	displayExpenses(filtered);
}

// Apply custom filters
function applyFilters() {
	const fromDate = document.getElementById('fromDate').value;
	const toDate = document.getElementById('toDate').value;
	const category = document.getElementById('filterCategory').value;

	let filtered = expenses;

	if (fromDate) {
		filtered = filtered.filter(expense => expense.date >= fromDate);
	}

	if (toDate) {
		filtered = filtered.filter(expense => expense.date <= toDate);
	}

	if (category) {
		filtered = filtered.filter(expense => expense.category === category);
	}

	displayExpenses(filtered);
}

// Category management
function updateCategorySelects() {
	const categorySelect = document.getElementById('category');
	const filterCategorySelect = document.getElementById('filterCategory');

	categorySelect.innerHTML = '<option value="">Select category</option>' +
		categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

	filterCategorySelect.innerHTML = '<option value="">All Categories</option>' +
		categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function showCategoryModal() {
	document.getElementById('categoryModal').style.display = 'block';
	displayCategories();
}

function closeCategoryModal() {
	document.getElementById('categoryModal').style.display = 'none';
}

function displayCategories() {
	const categoryList = document.getElementById('categoryList');
	categoryList.innerHTML = categories.map((cat, index) => `
		<div class="category-item">
			<span>${cat}</span>
			<div class="category-actions">
				<button onclick="editCategory(${index})">Edit</button>
				<button class="danger" onclick="deleteCategory(${index})">Delete</button>
			</div>
		</div>
	`).join('');
}

function addCategory() {
	const newCategory = document.getElementById('newCategory').value.trim();

	if (!newCategory) {
		alert('Please enter a category name');
		return;
	}

	if (categories.includes(newCategory)) {
		alert('Category already exists');
		return;
	}

	categories.push(newCategory);
	saveData();
	updateCategorySelects();
	displayCategories();
	document.getElementById('newCategory').value = '';
	alert('Category added successfully!');
}

function editCategory(index) {
	const newName = prompt('Enter new category name:', categories[index]);

	if (newName && newName.trim()) {
		if (categories.includes(newName.trim()) && categories.indexOf(newName.trim()) !== index) {
			alert('Category already exists');
			return;
		}

		const oldName = categories[index];
		categories[index] = newName.trim();

		// Update expenses with this category
		expenses.forEach(expense => {
			if (expense.category === oldName) {
				expense.category = newName.trim();
			}
		});

		saveData();
		updateCategorySelects();
		displayCategories();
		displayExpenses();
		if (chartsInitialized) {
			updateCharts();
		}
		alert('Category updated successfully!');
	}
}

function deleteCategory(index) {
	const categoryName = categories[index];
	const expensesWithCategory = expenses.filter(e => e.category === categoryName).length;

	let confirmMessage = `Are you sure you want to delete "${categoryName}"?`;
	if (expensesWithCategory > 0) {
		confirmMessage += `\n\nThis category is used in ${expensesWithCategory} expense(s). These will be changed to "Uncategorized".`;
	}

	if (confirm(confirmMessage)) {
		categories.splice(index, 1);

		// Update expenses with this category
		expenses.forEach(expense => {
			if (expense.category === categoryName) {
				expense.category = 'Uncategorized';
			}
		});

		// Add Uncategorized if it doesn't exist
		if (!categories.includes('Uncategorized')) {
			categories.push('Uncategorized');
		}

		saveData();
		updateCategorySelects();
		displayCategories();
		displayExpenses();
		if (chartsInitialized) {
			updateCharts();
		}
		alert('Category deleted successfully!');
	}
}

// Statistics
function updateStatistics() {
	const statsGrid = document.getElementById('statsGrid');

	// Calculate statistics
	const totalExpenses = expenses.length;
	const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

	// Category breakdown
	const categoryTotals = {};
	expenses.forEach(expense => {
		categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
	});

	// Find highest category
	let highestCategory = '';
	let highestAmount = 0;
	for (const [category, amount] of Object.entries(categoryTotals)) {
		if (amount > highestAmount) {
			highestAmount = amount;
			highestCategory = category;
		}
	}

	// Average expense
	const avgExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

	// This month's total
	const currentMonth = new Date().toISOString().slice(0, 7);
	const monthTotal = expenses
		.filter(e => e.date.startsWith(currentMonth))
		.reduce((sum, e) => sum + e.amount, 0);

	statsGrid.innerHTML = 
		'<div class="stat-card">' +
			'<div class="stat-value">' + totalExpenses + '</div>' +
			'<div class="stat-label">Total Expenses</div>' +
		'</div>' +
		'<div class="stat-card">' +
			'<div class="stat-value">$' + totalAmount.toFixed(2) + '</div>' +
			'<div class="stat-label">Total Amount</div>' +
		'</div>' +
		'<div class="stat-card">' +
			'<div class="stat-value">$' + avgExpense.toFixed(2) + '</div>' +
			'<div class="stat-label">Average Expense</div>' +
		'</div>' +
		'<div class="stat-card">' +
			'<div class="stat-value">$' + monthTotal.toFixed(2) + '</div>' +
			'<div class="stat-label">This Month</div>' +
		'</div>' +
		'<div class="stat-card">' +
			'<div class="stat-value">' + (highestCategory || 'N/A') + '</div>' +
			'<div class="stat-label">Highest Category</div>' +
		'</div>' +
		'<div class="stat-card">' +
			'<div class="stat-value">' + categories.length + '</div>' +
			'<div class="stat-label">Categories</div>' +
		'</div>';
}

// Chart Functions
function initializeCharts() {
	console.log('Initializing charts...');

	// Category Pie Chart
	const pieCtx = document.getElementById('categoryPieChart').getContext('2d');
	charts.categoryPie = new Chart(pieCtx, {
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
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Expenses by Category',
					font: {
						size: 16
					}
				},
				legend: {
					position: 'bottom'
				}
			}
		}
	});

	// Category Bar Chart
	const barCtx = document.getElementById('categoryBarChart').getContext('2d');
	charts.categoryBar = new Chart(barCtx, {
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
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Spending by Category',
					font: {
						size: 16
					}
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

	// Monthly Trend Chart
	const monthlyCtx = document.getElementById('monthlyTrendChart').getContext('2d');
	charts.monthlyTrend = new Chart(monthlyCtx, {
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
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Monthly Spending Trend',
					font: {
						size: 16
					}
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

	// Daily Trend Chart (Last 30 days)
	const dailyCtx = document.getElementById('dailyTrendChart').getContext('2d');
	charts.dailyTrend = new Chart(dailyCtx, {
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
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Daily Spending (Last 30 Days)',
					font: {
						size: 16
					}
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

	// Category Trend Chart
	const categoryTrendCtx = document.getElementById('categoryTrendChart').getContext('2d');
	charts.categoryTrend = new Chart(categoryTrendCtx, {
		type: 'line',
		data: {
			labels: [],
			datasets: []
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Category Spending Trends',
					font: {
						size: 16
					}
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

	// Month Comparison Chart
	const monthComparisonCtx = document.getElementById('monthComparisonChart').getContext('2d');
	charts.monthComparison = new Chart(monthComparisonCtx, {
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
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'This Month vs Last Month',
					font: {
						size: 16
					}
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

	// Top Expenses Chart - Fixed: using 'bar' with horizontal axis
	const topExpensesCtx = document.getElementById('topExpensesChart').getContext('2d');
	charts.topExpenses = new Chart(topExpensesCtx, {
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
			indexAxis: 'y', // This makes it horizontal
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Top 10 Expenses',
					font: {
						size: 16
					}
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
}

function updateCharts() {
	console.log('Updating charts with', expenses.length, 'expenses');

	if (expenses.length === 0) {
		console.log('No expenses to display');
		return;
	}

	// Update Category Charts
	const categoryTotals = {};
	expenses.forEach(expense => {
		if (expense.category) {
			categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
		}
	});

	const categoryLabels = Object.keys(categoryTotals);
	const categoryData = Object.values(categoryTotals);

	console.log('Category totals:', categoryTotals);

	if (charts.categoryPie) {
		charts.categoryPie.data.labels = categoryLabels;
		charts.categoryPie.data.datasets[0].data = categoryData;
		charts.categoryPie.update();
	}

	if (charts.categoryBar) {
		charts.categoryBar.data.labels = categoryLabels;
		charts.categoryBar.data.datasets[0].data = categoryData;
		charts.categoryBar.update();
	}

	// Update Monthly Trend
	const monthlyData = {};
	expenses.forEach(expense => {
		const month = expense.date.substring(0, 7);
		monthlyData[month] = (monthlyData[month] || 0) + expense.amount;
	});

	const sortedMonths = Object.keys(monthlyData).sort();

	if (charts.monthlyTrend) {
		charts.monthlyTrend.data.labels = sortedMonths.map(month => {
			const date = new Date(month + '-01');
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
		});
		charts.monthlyTrend.data.datasets[0].data = sortedMonths.map(month => monthlyData[month]);
		charts.monthlyTrend.update();
	}

	// Update Daily Trend (Last 30 days)
	const today = new Date();
	const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
	const dailyData = {};

	// Initialize all days to 0
	for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
		const dateStr = d.toISOString().split('T')[0];
		dailyData[dateStr] = 0;
	}

	// Fill in actual expense data
	expenses.forEach(expense => {
		if (expense.date >= thirtyDaysAgo.toISOString().split('T')[0]) {
			if (dailyData.hasOwnProperty(expense.date)) {
				dailyData[expense.date] += expense.amount;
			}
		}
	});

	const dailyLabels = Object.keys(dailyData).map(date => {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	});

	if (charts.dailyTrend) {
		charts.dailyTrend.data.labels = dailyLabels;
		charts.dailyTrend.data.datasets[0].data = Object.values(dailyData);
		charts.dailyTrend.update();
	}

	// Update other charts
	updateCategoryTrendChart();
	updateMonthComparisonChart();
	updateTopExpensesChart();
}

function updateCategoryTrendChart() {
	const monthlyCategories = {};

	expenses.forEach(expense => {
		const month = expense.date.substring(0, 7);
		if (!monthlyCategories[month]) {
			monthlyCategories[month] = {};
		}
		if (expense.category) {
			monthlyCategories[month][expense.category] = 
				(monthlyCategories[month][expense.category] || 0) + expense.amount;
		}
	});

	const months = Object.keys(monthlyCategories).sort().slice(-6); // Last 6 months
	const datasets = [];
	const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

	// Get top 6 categories by total amount
	const categoryTotals = {};
	expenses.forEach(expense => {
		if (expense.category) {
			categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
		}
	});

	const topCategories = Object.entries(categoryTotals)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6)
		.map(([category]) => category);

	topCategories.forEach((category, index) => {
		datasets.push({
			label: category,
			data: months.map(month => monthlyCategories[month][category] || 0),
			borderColor: colors[index % colors.length],
			backgroundColor: colors[index % colors.length] + '20',
			tension: 0.1
		});
	});

	if (charts.categoryTrend) {
		charts.categoryTrend.data.labels = months.map(month => {
			const date = new Date(month + '-01');
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
		});
		charts.categoryTrend.data.datasets = datasets;
		charts.categoryTrend.update();
	}
}

function updateMonthComparisonChart() {
	const today = new Date();
	const thisMonth = today.toISOString().substring(0, 7);
	const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().substring(0, 7);

	const thisMonthByCategory = {};
	const lastMonthByCategory = {};

	expenses.forEach(expense => {
		if (expense.date.startsWith(thisMonth) && expense.category) {
			thisMonthByCategory[expense.category] = 
				(thisMonthByCategory[expense.category] || 0) + expense.amount;
		} else if (expense.date.startsWith(lastMonth) && expense.category) {
			lastMonthByCategory[expense.category] = 
				(lastMonthByCategory[expense.category] || 0) + expense.amount;
		}
	});

	const allCategories = [...new Set([
		...Object.keys(thisMonthByCategory),
		...Object.keys(lastMonthByCategory)
	])];

	if (charts.monthComparison) {
		charts.monthComparison.data.labels = allCategories;
		charts.monthComparison.data.datasets[0].data = allCategories.map(cat => thisMonthByCategory[cat] || 0);
		charts.monthComparison.data.datasets[1].data = allCategories.map(cat => lastMonthByCategory[cat] || 0);
		charts.monthComparison.update();
	}
}

function updateTopExpensesChart() {
	const topExpenses = [...expenses]
		.sort((a, b) => b.amount - a.amount)
		.slice(0, 10);

	if (charts.topExpenses) {
		charts.topExpenses.data.labels = topExpenses.map(e => 
			e.description.length > 30 ? e.description.substring(0, 30) + '...' : e.description
		);
		charts.topExpenses.data.datasets[0].data = topExpenses.map(e => e.amount);
		charts.topExpenses.update();
	}
}

// Chart tab switching
function showChartTab(tab) {
	// Update tab buttons
	document.querySelectorAll('.chart-tab').forEach(btn => {
		btn.classList.remove('active');
	});
	event.target.classList.add('active');

	// Update chart content
	document.querySelectorAll('.chart-content').forEach(content => {
		content.classList.remove('active');
	});
	document.getElementById(tab + '-charts').classList.add('active');

	// Force chart resize
	setTimeout(() => {
		Object.values(charts).forEach(chart => {
			if (chart && chart.resize) {
				chart.resize();
			}
		});
	}, 100);
}

// Export functions
function exportToCSV() {
	if (expenses.length === 0) {
		alert('No expenses to export');
		return;
	}

	let csv = 'Date,Description,Category,Amount\n';
	expenses.forEach(expense => {
		csv += `${expense.date},"${expense.description}","${expense.category}",${expense.amount}\n`;
	});

	const blob = new Blob([csv], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

function exportToJSON() {
	if (expenses.length === 0 && !confirm('No expenses to export. Export settings only?')) {
		return;
	}

	const data = {
		expenses: expenses,
		categories: categories,
		reminderSettings: reminderSettings, // Add this line
		exportDate: new Date().toISOString()
	};

	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

// Import functions
function importData(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	const fileType = file.name.split('.').pop().toLowerCase();

	reader.onload = function(e) {
		try {
			if (fileType === 'json') {
				const data = JSON.parse(e.target.result);
				if (data.expenses) {
					expenses = data.expenses;
				}
				if (data.categories) {
					categories = data.categories;
				}
				if (data.reminderSettings) {
					reminderSettings = data.reminderSettings;
					localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));
					loadReminderSettings();
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

				expenses = expenses.concat(newExpenses);

				// Add new categories if they don't exist
				newExpenses.forEach(expense => {
					if (!categories.includes(expense.category)) {
						categories.push(expense.category);
					}
				});
			}

			saveData();
			updateCategorySelects();
			displayExpenses();
			updateStatistics();
			if (chartsInitialized) {
				updateCharts();
			}
			alert('Data imported successfully!');
		} catch (error) {
			alert('Error importing data: ' + error.message);
		}
	};

	reader.readAsText(file);
	event.target.value = ''; // Reset file input
}

function parseCSVLine(line) {
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
}

// Clear all data
function clearAllData() {
	if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
		if (confirm('This will delete all expenses and reset categories. Are you absolutely sure?')) {
			expenses = [];
			categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'];
			saveData();
			updateCategorySelects();
			displayExpenses();
			updateStatistics();
			if (chartsInitialized) {
				updateCharts();
			}
			alert('All data has been cleared!');
		}
	}
}

// Close modal when clicking outside
window.onclick = function(event) {
	const modal = document.getElementById('categoryModal');
	if (event.target === modal) {
		closeCategoryModal();
	}
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
	// Escape to close modal
	if (e.key === 'Escape') {
		closeCategoryModal();
		cancelEdit();
	}

	// Ctrl+S to export
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		exportToJSON();
	}

	// Ctrl+E to switch to Expenses tab
	if (e.ctrlKey && e.key === 'e') {
		e.preventDefault();
		document.querySelector('.main-tab').click();
	}

	// Ctrl+T to switch to Stats tab
	if (e.ctrlKey && e.key === 't') {
		e.preventDefault();
		document.querySelectorAll('.main-tab')[1].click();
	}
});

// Click outside to cancel edit
document.addEventListener('click', function(e) {
	if (editingCell && !e.target.closest('.editable-cell')) {
		cancelEdit();
	}
});
