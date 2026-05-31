/* ==========================================================================
   AetherTasks - Premium Glassmorphic Application Script
   ========================================================================== */

// --- STATE MANAGEMENT ---
let tasks = [];
let currentFilter = 'all'; // all, active, completed
let currentSort = 'dueDate'; // dueDate, priority, name, order
let searchQuery = '';
let theme = 'dark'; // dark or light
let taskToDeleteId = null; // Holds task id slated for deletion
let isClearingCompleted = false; // Flag to determine action on confirmation

// --- DOM ELEMENTS SELECTORS ---
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskPrioritySelect = document.getElementById('task-priority');
const taskCategoryInput = document.getElementById('task-category');
const taskDueInput = document.getElementById('task-due');
const taskListContainer = document.getElementById('task-list');
const emptyStateContainer = document.getElementById('empty-state');
const emptyStateText = document.getElementById('empty-state-text');

// Analytics elements
const progressCircle = document.getElementById('progress-circle');
const progressPercentage = document.getElementById('progress-percentage');
const countTotal = document.getElementById('count-total');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');
const fillTotal = document.getElementById('fill-total');
const fillActive = document.getElementById('fill-active');
const fillCompleted = document.getElementById('fill-completed');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

// Search & Filter controls
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterTabBtns = document.querySelectorAll('.tab-btn');
const sortSelect = document.getElementById('sort-select');

// Theme toggler
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIconDark = themeToggleBtn.querySelector('.theme-icon-dark');
const themeIconLight = themeToggleBtn.querySelector('.theme-icon-light');

// Modals
const confirmModal = document.getElementById('confirm-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalCloseBtn = document.getElementById('modal-close');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');

// Excel Actions
const exportExcelBtn = document.getElementById('export-excel-btn');
const importExcelTriggerBtn = document.getElementById('import-excel-trigger-btn');
const importExcelFileInput = document.getElementById('import-excel-file-input');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// SVG Circle circumference details
const CIRCLE_RADIUS = 42;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~263.89

// --- INLINE HELPER FUNCTIONS ---

/**
 * Saves current app state to localStorage
 */
function saveToStorage() {
    try {
        localStorage.setItem('aether_tasks', JSON.stringify(tasks));
        localStorage.setItem('aether_theme', theme);
    } catch (e) {
        console.error("Local Storage Save Error:", e);
        showToast("Storage quota exceeded or storage disabled.", "error");
    }
}

/**
 * Loads tasks and configurations from localStorage
 */
function loadFromStorage() {
    try {
        const loadedTasks = localStorage.getItem('aether_tasks');
        const loadedTheme = localStorage.getItem('aether_theme');
        
        if (loadedTasks) {
            tasks = JSON.parse(loadedTasks);
            // Ensure every task has an order index
            tasks.forEach((task, idx) => {
                if (task.order === undefined) {
                    task.order = idx;
                }
            });
        } else {
            // Setup demo tasks if workspace is completely empty
            tasks = [
                {
                    id: 'demo-1',
                    title: 'Explore AetherTasks and customize your workspace',
                    completed: false,
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16), // Due in 2 hours
                    category: 'Quickstart',
                    order: 0
                },
                {
                    id: 'demo-2',
                    title: 'Create a high-priority task with a specific due date',
                    completed: false,
                    priority: 'high',
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Tomorrow
                    category: 'Goals',
                    order: 1
                },
                {
                    id: 'demo-3',
                    title: 'Try dragging task cards to reorder them manually',
                    completed: false,
                    priority: 'low',
                    dueDate: '',
                    category: 'Tips',
                    order: 2
                },
                {
                    id: 'demo-4',
                    title: 'Completed a key milestone today!',
                    completed: true,
                    priority: 'low',
                    dueDate: '',
                    category: 'Celebration',
                    order: 3
                }
            ];
            saveToStorage();
        }

        if (loadedTheme) {
            theme = loadedTheme;
        } else {
            // Check system preferences
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                theme = 'light';
            }
        }
        applyTheme();
    } catch (e) {
        console.error("Local Storage Load Error:", e);
        showToast("Error loading storage. Starting fresh.", "warning");
    }
}

/**
 * Applies current theme state (light or dark) to the page body
 */
function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
        themeIconDark.style.display = 'none';
        themeIconLight.style.display = 'inline-block';
    } else {
        themeIconDark.style.display = 'inline-block';
        themeIconLight.style.display = 'none';
    }
}

/**
 * Displays a premium toast notification card
 * @param {string} message 
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose appropriate icon
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    else if (type === 'error') iconClass = 'fa-circle-exclamation';
    else if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close Notification"><i class="fa-solid fa-xmark"></i></button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Wire close button click
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Self-destruct sequence
    setTimeout(() => {
        if (toast.parentNode) {
            removeToast(toast);
        }
    }, 3800);
}

function removeToast(toast) {
    toast.classList.add('toast-closing');
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

/**
 * Calculates due date descriptions relative to the current time
 * @param {string} dueDateStr 
 */
function calculateDueState(dueDateStr) {
    if (!dueDateStr) return null;
    
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffMs = due - now;
    
    const dateOptions = { month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const dateStr = due.toLocaleDateString([], dateOptions);
    const timeStr = due.toLocaleTimeString([], timeOptions);
    
    let text = '';
    let state = 'normal'; // overdue, due-today, normal
    
    if (diffMs < 0) {
        text = `Overdue! (Due ${dateStr} at ${timeStr})`;
        state = 'overdue';
    } else {
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        if (diffHours <= 24) {
            if (due.getDate() === now.getDate()) {
                text = `Due Today at ${timeStr}`;
                state = 'due-today';
            } else {
                text = `Due Tomorrow at ${timeStr}`;
            }
        } else {
            text = `Due ${dateStr} at ${timeStr}`;
        }
    }
    
    return { text, state };
}

// --- RENDER PIPELINE ---

/**
 * Updates analytic widgets (counters, bar gauges, circular rings)
 */
function renderAnalytics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    
    // Percentage Calculation
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update textual nodes
    countTotal.textContent = total;
    countActive.textContent = active;
    countCompleted.textContent = completed;
    progressPercentage.textContent = `${percentage}%`;
    
    // Update simple flat progress fills
    fillTotal.style.width = total > 0 ? '100%' : '0%';
    fillActive.style.width = total > 0 ? `${(active / total) * 100}%` : '0%';
    fillCompleted.style.width = total > 0 ? `${percentage}%` : '0%';
    
    // Update Circle Ring stroke-dashoffset
    // Offset calculation: CIRCLE_CIRCUMFERENCE - (percentage / 100) * CIRCLE_CIRCUMFERENCE
    const offset = CIRCLE_CIRCUMFERENCE - (percentage / 100) * CIRCLE_CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
    
    // Disable/Enable clear completed button
    clearCompletedBtn.disabled = completed === 0;
}

/**
 * Main rendering loop that filters, sorts, and redraws tasks
 */
function renderTasks() {
    // 1. Clear Task list container
    taskListContainer.innerHTML = '';
    
    // 2. Perform filtering
    let filteredTasks = tasks.filter(task => {
        // Search Filter
        const matchesSearch = searchQuery === '' || 
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.category && task.category.toLowerCase().includes(searchQuery.toLowerCase()));
            
        // Status Filter
        if (currentFilter === 'active') {
            return !task.completed && matchesSearch;
        } else if (currentFilter === 'completed') {
            return task.completed && matchesSearch;
        }
        
        return matchesSearch;
    });
    
    // 3. Perform sorting
    filteredTasks.sort((a, b) => {
        if (currentSort === 'dueDate') {
            // Empty dates always sorted to bottom
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (currentSort === 'priority') {
            const priorities = { high: 3, medium: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority]; // High to Low
        } else if (currentSort === 'name') {
            return a.title.localeCompare(b.title);
        } else if (currentSort === 'order') {
            return (a.order ?? 0) - (b.order ?? 0);
        }
        return 0;
    });
    
    // 4. Handle Empty State UI
    if (filteredTasks.length === 0) {
        emptyStateContainer.style.display = 'flex';
        if (searchQuery !== '') {
            emptyStateText.textContent = `We couldn't find any tasks matching "${searchQuery}". Try refining your query!`;
        } else if (currentFilter === 'active') {
            emptyStateText.textContent = "Hooray! No active tasks to complete right now. You are all caught up!";
        } else if (currentFilter === 'completed') {
            emptyStateText.textContent = "No completed tasks yet. Keep moving forward, you'll get there!";
        } else {
            emptyStateText.textContent = "Ready to achieve your goals? Create a new task on the left control panel to get started!";
        }
    } else {
        emptyStateContainer.style.display = 'none';
        
        // 5. Draw elements in task list
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.setAttribute('draggable', 'true');
            li.setAttribute('data-id', task.id);
            
            // Due date calculations
            const dueDetails = calculateDueState(task.dueDate);
            
            // Build task element nodes
            li.innerHTML = `
                <!-- Checkbox -->
                <div class="task-checkbox-container">
                    <button class="task-checkbox" aria-label="Toggle Complete" title="${task.completed ? 'Mark Active' : 'Mark Completed'}">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
                
                <!-- Center details -->
                <div class="task-details">
                    <div class="task-title-group">
                        <span class="task-title">${escapeHTML(task.title)}</span>
                    </div>
                    <div class="task-meta">
                        <!-- Priority Badge -->
                        <span class="meta-badge badge-priority-${task.priority}">
                            <i class="fa-solid fa-circle-exclamation"></i> ${capitalize(task.priority)}
                        </span>
                        
                        <!-- Category Badge -->
                        ${task.category ? `
                            <span class="meta-badge badge-tag">
                                <i class="fa-solid fa-tag"></i> ${escapeHTML(task.category)}
                            </span>
                        ` : ''}
                        
                        <!-- Due Date Badge -->
                        ${dueDetails ? `
                            <span class="meta-badge badge-date ${dueDetails.state}">
                                <i class="fa-regular fa-clock"></i> ${dueDetails.text}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="task-actions">
                    <button class="btn-icon btn-edit" title="Edit Task" aria-label="Edit Task">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Delete Task" aria-label="Delete Task">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            
            // Bind Task action event listeners
            bindTaskItemEvents(li, task);
            
            taskListContainer.appendChild(li);
        });
    }
    
    // 6. Update Analytics panel
    renderAnalytics();
}

/**
 * Escapes characters to prevent XSS vulnerability in template strings
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- INTERACTIVE EVENT BINDINGS FOR TASK CARD ---

function bindTaskItemEvents(li, task) {
    // 1. Checkbox action (Toggle complete)
    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTaskComplete(task.id);
    });

    // 2. Edit Action
    const editBtn = li.querySelector('.btn-edit');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(li, task);
    });

    // 3. Delete Action
    const deleteBtn = li.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerDeleteConfirmation(task.id);
    });

    // 4. Native Drag and Drop API Listeners
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('dragleave', handleDragLeave);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);
}

// --- CONTROLLER ACTIONS (MUTATORS) ---

/**
 * Adds a new task based on form elements
 */
function handleAddTask(e) {
    e.preventDefault();
    
    const title = taskTitleInput.value.trim();
    if (!title) return;
    
    const priority = taskPrioritySelect.value;
    const category = taskCategoryInput.value.trim();
    const dueDate = taskDueInput.value; // Returns "YYYY-MM-DDTHH:MM" or ""
    
    // Create new Task structure
    const newTask = {
        id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: title,
        completed: false,
        priority: priority,
        dueDate: dueDate,
        category: category,
        order: tasks.length // Place at the end of the order index
    };
    
    tasks.push(newTask);
    saveToStorage();
    
    // Reset Form Input nodes safely
    taskForm.reset();
    
    // Feedback
    showToast(`Task "${title.substring(0, 18)}${title.length > 18 ? '...' : ''}" created successfully.`, 'success');
    
    // Rerender list
    renderTasks();
}

/**
 * Toggles a task's completion status
 */
function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    task.completed = !task.completed;
    saveToStorage();
    
    const msg = task.completed ? `Checked off: "${task.title.substring(0, 18)}..."` : `Re-opened: "${task.title.substring(0, 18)}..."`;
    showToast(msg, task.completed ? 'success' : 'info');
    
    renderTasks();
}

/**
 * Puts a task card into its inline-editing form view state
 */
function enterEditMode(li, task) {
    // Prevent dragging during edit
    li.setAttribute('draggable', 'false');
    li.classList.add('editing-state');
    
    // Generate inline editing templates
    li.innerHTML = `
        <div class="edit-mode-container" data-id="${task.id}">
            <div class="edit-inputs-row">
                <input type="text" class="edit-title-input" value="${escapeHTML(task.title)}" required placeholder="Update task title...">
            </div>
            
            <div class="edit-dropdowns">
                <!-- Priority -->
                <div class="select-wrapper">
                    <select class="edit-select edit-priority-select">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
                
                <!-- Category/Tag -->
                <div class="input-wrapper">
                    <input type="text" class="edit-category-input" placeholder="Tag" value="${escapeHTML(task.category || '')}">
                </div>
                
                <!-- Due Date -->
                <input type="datetime-local" class="edit-date-input" value="${task.dueDate || ''}">
            </div>
            
            <div class="edit-actions">
                <button class="btn glass-btn btn-cancel-edit"><i class="fa-solid fa-xmark"></i> Cancel</button>
                <button class="btn btn-primary btn-save-edit"><i class="fa-solid fa-floppy-disk"></i> Save</button>
            </div>
        </div>
    `;
    
    // Wire Edit mode Actions
    const cancelBtn = li.querySelector('.btn-cancel-edit');
    const saveBtn = li.querySelector('.btn-save-edit');
    
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderTasks(); // Discards changes by drawing state anew
    });
    
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveTaskEdit(li, task.id);
    });
    
    // Focus title input immediately
    const titleInput = li.querySelector('.edit-title-input');
    titleInput.focus();
    
    // Allow keyboard Enter to save inline and Escape to cancel
    titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTaskEdit(li, task.id);
        } else if (e.key === 'Escape') {
            renderTasks();
        }
    });
}

/**
 * Commits the edited values back to the tasks state and stores them
 */
function saveTaskEdit(li, id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newTitle = li.querySelector('.edit-title-input').value.trim();
    if (!newTitle) {
        showToast("Task title cannot be empty.", "warning");
        return;
    }
    
    const newPriority = li.querySelector('.edit-priority-select').value;
    const newCategory = li.querySelector('.edit-category-input').value.trim();
    const newDueDate = li.querySelector('.edit-date-input').value;
    
    // Mutate state
    task.title = newTitle;
    task.priority = newPriority;
    task.category = newCategory;
    task.dueDate = newDueDate;
    
    saveToStorage();
    showToast("Task updated successfully.", "success");
    
    renderTasks();
}

// --- MODAL DIALOGS CONTROLLER ---

/**
 * Triggers modal view overlay for delete task confirm
 */
function triggerDeleteConfirmation(id) {
    taskToDeleteId = id;
    isClearingCompleted = false;
    
    const task = tasks.find(t => t.id === id);
    modalTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-danger"></i> Delete Task?`;
    modalDesc.innerHTML = `Are you sure you want to permanently delete the task <strong>"${escapeHTML(task.title)}"</strong>? This action cannot be reversed.`;
    
    openModal();
}

/**
 * Triggers confirmation modal for deleting all completed tasks
 */
function triggerClearCompletedConfirmation() {
    taskToDeleteId = null;
    isClearingCompleted = true;
    
    const completedCount = tasks.filter(t => t.completed).length;
    modalTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-danger"></i> Clear Completed Tasks?`;
    modalDesc.innerHTML = `Are you sure you want to wipe out all <strong>${completedCount}</strong> completed tasks permanently? This cannot be undone.`;
    
    openModal();
}

function openModal() {
    confirmModal.classList.add('open');
    modalConfirmBtn.focus();
}

function closeModal() {
    confirmModal.classList.remove('open');
    taskToDeleteId = null;
    isClearingCompleted = false;
}

/**
 * Action taken when confirm modal button is clicked
 */
function handleModalConfirm() {
    if (isClearingCompleted) {
        // Clear all completed tasks operation
        const beforeCount = tasks.length;
        tasks = tasks.filter(t => !t.completed);
        const clearedCount = beforeCount - tasks.length;
        
        saveToStorage();
        showToast(`Cleared ${clearedCount} completed task${clearedCount > 1 ? 's' : ''}.`, 'success');
        closeModal();
        renderTasks();
    } else if (taskToDeleteId) {
        // Individual task delete operation
        const taskIndex = tasks.findIndex(t => t.id === taskToDeleteId);
        if (taskIndex !== -1) {
            const title = tasks[taskIndex].title;
            tasks.splice(taskIndex, 1);
            
            // Re-order remaining tasks indices
            tasks.forEach((task, idx) => task.order = idx);
            
            saveToStorage();
            showToast(`Task "${title.substring(0, 18)}..." deleted.`, 'info');
        }
        closeModal();
        renderTasks();
    }
}

// --- NATIVE DRAG AND DROP HANDLERS ---
let dragSourceElement = null;

function handleDragStart(e) {
    this.classList.add('dragging');
    dragSourceElement = this;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));
    
    // Visual drag feedback styling
    setTimeout(() => {
        this.style.opacity = '0.4';
    }, 0);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Required to allow dropping!
    }
    
    e.dataTransfer.dropEffect = 'move';
    
    if (this !== dragSourceElement) {
        this.classList.add('drag-over-item');
    }
    
    return false;
}

function handleDragEnter(e) {
    if (this !== dragSourceElement) {
        this.classList.add('drag-over-item');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over-item');
}

function handleDrop(e) {
    e.stopPropagation(); // Stops browser redirects
    e.preventDefault();
    
    const dragId = e.dataTransfer.getData('text/plain');
    const dropId = this.getAttribute('data-id');
    
    if (dragId && dropId && dragId !== dropId) {
        // Find indices in primary array
        const dragIndex = tasks.findIndex(t => t.id === dragId);
        const dropIndex = tasks.findIndex(t => t.id === dropId);
        
        if (dragIndex !== -1 && dropIndex !== -1) {
            // Remove dragging element from array
            const [removedTask] = tasks.splice(dragIndex, 1);
            // Insert it back at target dropped location
            tasks.splice(dropIndex, 0, removedTask);
            
            // Re-calculate the custom ordering state
            tasks.forEach((task, idx) => {
                task.order = idx;
            });
            
            saveToStorage();
            
            // Set sorting state to 'order' automatically to reflect visual drop
            if (currentSort !== 'order') {
                currentSort = 'order';
                sortSelect.value = 'order';
                showToast("Switched sorting to Custom Drag Order.", "info");
            }
            
            renderTasks();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';
    
    // Remove drag highlights from all items
    const items = taskListContainer.querySelectorAll('.task-item');
    items.forEach(item => {
        item.classList.remove('drag-over-item');
    });
    
    dragSourceElement = null;
}

// --- DATA FILE MANAGEMENT (EXPORT / IMPORT JSON) ---



/**
 * Exports tasks to an Excel (.xlsx) file
 */
function handleExportExcel() {
    if (tasks.length === 0) {
        showToast("There are no tasks to export.", "warning");
        return;
    }
    
    try {
        // Prepare data for Excel with proper formatting
        const excelData = tasks.map(task => ({
            'Task Title': task.title,
            'Category': task.category || '',
            'Priority': task.priority || 'medium',
            'Completed': task.completed ? 'Yes' : 'No',
            'Due Date': task.dueDate || '',
            'Created': task.createdAt || ''
        }));
        
        // Create a new workbook
        const workbook = XLSX.utils.book_new();
        
        // Add a worksheet with the data
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths for better readability
        const columnWidths = [
            { wch: 30 },  // Task Title
            { wch: 15 },  // Category
            { wch: 12 },  // Priority
            { wch: 12 },  // Completed
            { wch: 15 },  // Due Date
            { wch: 20 }   // Created
        ];
        worksheet['!cols'] = columnWidths;
        
        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
        
        // Generate filename with date
        const dateStamp = new Date().toISOString().slice(0, 10);
        const filename = `AetherTasks-${dateStamp}.xlsx`;
        
        // Write the file
        XLSX.writeFile(workbook, filename);
        
        showToast("Tasks exported to Excel successfully!", "success");
    } catch (e) {
        console.error("Excel Export Error:", e);
        showToast("Failed to export tasks to Excel.", "error");
    }
}

/**
 * Imports tasks from an Excel (.xlsx) file
 */
function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            // Read the Excel file
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first worksheet
            const firstSheet = workbook.SheetNames[0];
            if (!firstSheet) {
                throw new Error("Excel file appears to be empty.");
            }
            
            // Parse the worksheet to JSON
            const worksheet = workbook.Sheets[firstSheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (!Array.isArray(jsonData) || jsonData.length === 0) {
                throw new Error("No task data found in Excel file.");
            }
            
            // Map Excel columns to task objects
            const importedTasks = jsonData.map((row, idx) => {
                // Support both original column names and Excel export format
                const title = row['Task Title'] || row['title'] || '';
                if (!title) {
                    throw new Error(`Task at row ${idx + 2} has no title.`);
                }
                
                return {
                    id: 'task-' + Date.now() + '-' + idx,
                    title: title,
                    category: row['Category'] || row['category'] || '',
                    priority: row['Priority'] || row['priority'] || 'medium',
                    completed: (row['Completed'] === 'Yes' || row['Completed'] === true || row['completed'] === true) ? true : false,
                    dueDate: row['Due Date'] || row['dueDate'] || '',
                    createdAt: row['Created'] || row['createdAt'] || new Date().toISOString(),
                    order: idx
                };
            });
            
            // Append imported tasks to existing tasks
            tasks = tasks.concat(importedTasks);
            saveToStorage();
            renderTasks();
            
            showToast(`Successfully imported ${importedTasks.length} tasks from Excel!`, 'success');
        } catch (err) {
            console.error("Excel Import Error:", err);
            showToast(`Import Failed: ${err.message || 'Invalid Excel format'}`, 'error');
        }
        
        // Reset file input
        importExcelFileInput.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}

// --- SETUP INITIAL EVENT BINDINGS AND LIFECYCLE ---

function setupEventListeners() {
    // Add task form
    taskForm.addEventListener('submit', handleAddTask);
    
    // Theme toggle button
    themeToggleBtn.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        saveToStorage();
        showToast(`Theme switched to ${theme === 'dark' ? 'Dark' : 'Light'} Mode.`, 'success');
    });
    
    // Search instant listener
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery !== '') {
            clearSearchBtn.style.display = 'inline-flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderTasks();
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderTasks();
    });
    
    // Filter tabs toggle clicks
    filterTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterTabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });
    
    // Sort change selector
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });
    
    // Clear Completed button
    clearCompletedBtn.addEventListener('click', triggerClearCompletedConfirmation);
    
    // Modal Overlay buttons
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    modalConfirmBtn.addEventListener('click', handleModalConfirm);
    
    // Close modal clicking outside
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeModal();
        }
    });
    
    // Excel File Action triggers
    exportExcelBtn.addEventListener('click', handleExportExcel);
    
    importExcelTriggerBtn.addEventListener('click', () => {
        importExcelFileInput.click();
    });
    
    importExcelFileInput.addEventListener('change', handleImportExcel);
    
    // Keyboard Shortcut hook (Escape closes modals)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (confirmModal.classList.contains('open')) {
                closeModal();
            }
        }
    });
}

// --- BOOTSTRAP INITIALIZATION ---
function init() {
    loadFromStorage();
    setupEventListeners();
    renderTasks();
    showToast("AetherTasks Dashboard loaded successfully.", "info");
}

// Kickstart
document.addEventListener('DOMContentLoaded', init);
