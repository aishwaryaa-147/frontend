
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5500/api'  // Local development
  : 'https://invoice-app-backend.onrender.com/api';  

// API Helper Functions
class ApiService {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try { 
            const response = await fetch(url, config);

            // Handle non-JSON responses
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);

            // Handle network errors
            const msg = (error && error.message) ? error.message.toLowerCase() : '';
            if (error.name === 'TypeError' || msg.includes('fetch') || msg.includes('failed')) {
                throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:5500');
            }

            // Re-throw with more context
            throw new Error(error.message || 'Network error or server unavailable');
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}


class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeEventListeners();
    }

    setupThemeEventListeners() {
        const toggle = document.getElementById('themeToggle');
        const toggleAuth = document.getElementById('themeToggleAuth');
        if (toggle) toggle.addEventListener('click', () => this.toggleTheme());
        if (toggleAuth) toggleAuth.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        this.saveTheme(this.currentTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.getElementById('themeIcon');
        const iconAuth = document.getElementById('themeIconAuth');

        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
        if (iconAuth) {
            iconAuth.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    loadTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupAuthEventListeners();
        this.checkAuthStatus();
    }

    setupAuthEventListeners() {
        const loginForm = document.getElementById('loginFormElement');
        const signupForm = document.getElementById('signupFormElement');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(e); });
        }
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSignup(e); });
        }

        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupForm();
            });
        }
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    checkAuthStatus() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showMainApp();
        } else {
            this.showAuthForm();
        }
    }

    showAuthForm() {
        const authContainer = document.getElementById('authContainer');
        const mainApp = document.getElementById('mainApp');
        if (authContainer) authContainer.style.display = 'flex';
        if (mainApp) mainApp.style.display = 'none';
    }

    showMainApp() {
        const authContainer = document.getElementById('authContainer');
        const mainApp = document.getElementById('mainApp');
        const userInfo = document.getElementById('userInfo');
        const addInvoiceBtn = document.getElementById('addInvoiceBtn');
        const themeToggle = document.getElementById('themeToggle');
        const userName = document.getElementById('userName');

        if (authContainer) authContainer.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        if (userInfo) userInfo.style.display = 'flex';
        if (addInvoiceBtn) addInvoiceBtn.style.display = 'inline-flex';
        if (themeToggle) themeToggle.style.display = 'inline-flex';
        if (userName) userName.textContent = this.currentUser.name;

        if (!window.invoiceManager) {
            window.invoiceManager = new InvoiceManager(this.currentUser.id);
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
    }

    showSignupForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const user = await ApiService.post('/auth/login', { email, password });
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.showMainApp();
            this.showNotification('Welcome back!', 'success');
        } catch (error) {
            this.showNotification(error.message || 'Invalid email or password', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            await ApiService.post('/auth/register', { name, email, password });

            // Auto-login after signup
            const user = await ApiService.post('/auth/login', { email, password });
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));

            this.showMainApp();
            this.showNotification('Account created successfully!', 'success');
        } catch (error) {
            this.showNotification(error.message || 'Signup failed', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showAuthForm();
        this.showLoginForm();

        window.invoiceManager = null;

        this.showNotification('Logged out successfully', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

class InvoiceManager {
    constructor(userId) {
        this.userId = userId;
        this.invoices = [];
        this.currentEditingId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setDefaultDates();
        await this.loadInvoices();
        this.updateStatistics();
        this.generateInvoiceNumber();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addInvoiceBtn');
        const createFirst = document.getElementById('createFirstInvoice');
        const closeModalBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeDeleteModalBtn = document.getElementById('closeDeleteModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const invoiceForm = document.getElementById('invoiceForm');
        const addItemBtn = document.getElementById('addItem');

        if (addBtn) addBtn.addEventListener('click', () => this.openModal());
        if (createFirst) createFirst.addEventListener('click', () => this.openModal());
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
        if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', () => this.closeDeleteModal());
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        if (invoiceForm) invoiceForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        if (addItemBtn) addItemBtn.addEventListener('click', () => this.addItemRow());
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                this.removeItemRow(e.target);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity') ||
                e.target.classList.contains('item-price')) {
                this.calculateItemTotal(e.target);
            }
            if (e.target.id === 'taxRate') {
                this.calculateTotals();
            }
        });

        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        if (searchInput) searchInput.addEventListener('input', () => this.filterInvoices());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterInvoices());
        if (dateFilter) dateFilter.addEventListener('change', () => this.filterInvoices());

        const invoiceModal = document.getElementById('invoiceModal');
        const deleteModal = document.getElementById('deleteModal');
        if (invoiceModal) {
            invoiceModal.addEventListener('click', (e) => {
                if (e.target.id === 'invoiceModal') this.closeModal();
            });
        }
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target.id === 'deleteModal') this.closeDeleteModal();
            });
        }
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateString = dueDate.toISOString().split('T')[0];

        const invoiceDate = document.getElementById('invoiceDate');
        const dueDateEl = document.getElementById('dueDate');
        if (invoiceDate) invoiceDate.value = today;
        if (dueDateEl) dueDateEl.value = dueDateString;
    }

    generateInvoiceNumber() {
        const userInvoices = this.invoices.filter(inv => inv.userId === this.userId);
        const lastInvoice = userInvoices[userInvoices.length - 1];
        let nextNumber = 1;

        if (lastInvoice && lastInvoice.invoiceNumber) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) || 0;
            nextNumber = lastNumber + 1;
        }

        const invoiceNumberEl = document.getElementById('invoiceNumber');
        if (invoiceNumberEl) {
            invoiceNumberEl.value = `INV-${nextNumber.toString().padStart(4, '0')}`;
        }
    }

    openModal(invoiceId = null) {
        this.currentEditingId = invoiceId;
        const modal = document.getElementById('invoiceModal');
        const modalTitle = document.getElementById('modalTitle');

        if (invoiceId) {
            if (modalTitle) modalTitle.textContent = 'Edit Invoice';
            this.populateForm(invoiceId);
        } else {
            if (modalTitle) modalTitle.textContent = 'New Invoice';
            this.resetForm();
            this.generateInvoiceNumber();
        }

        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('invoiceModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
        this.currentEditingId = null;
    }

    openDeleteModal(invoiceId) {
        this.currentEditingId = invoiceId;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
        this.currentEditingId = null;
    }

    resetForm() {
        const form = document.getElementById('invoiceForm');
        if (form) form.reset();
        this.setDefaultDates();
        this.clearItems();
        this.addItemRow();
        this.calculateTotals();
    }

    populateForm(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId && inv.userId === this.userId);
        if (!invoice) return;

        const fields = {
            invoiceNumber: invoice.invoiceNumber || '',
            invoiceDate: invoice.invoiceDate || '',
            dueDate: invoice.dueDate || '',
            customerName: invoice.customerName || invoice.customer || '',
            customerEmail: invoice.customerEmail || '',
            customerAddress: invoice.customerAddress || '',
            status: invoice.status || 'draft',
            notes: invoice.notes || '',
            taxRate: invoice.taxRate || 0,
        };

        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        this.clearItems();
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => this.addItemRow(item));
        } else {
            this.addItemRow();
        }

        this.calculateTotals();
    }

    clearItems() {
        const container = document.getElementById('itemsContainer');
        if (container) container.innerHTML = '';
    }

    addItemRow(item = null) {
        const container = document.getElementById('itemsContainer');
        if (!container) return;

        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';

        itemRow.innerHTML = `
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="item-description" placeholder="Item description" value="${item ? item.description : ''}">
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="item-quantity" min="1" value="${item ? item.quantity : 1}">
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" class="item-price" min="0" step="0.01" placeholder="0.00" value="${item ? item.price : ''}">
            </div>
            <div class="form-group">
                <label>Total</label>
                <input type="number" class="item-total" readonly value="${item ? item.total : 0}">
            </div>
            <div class="form-group">
                <label>&nbsp;</label>
                <button type="button" class="btn btn-danger remove-item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(itemRow);

        if (item) {
            this.calculateItemTotal(itemRow.querySelector('.item-quantity'));
        }
    }

    removeItemRow(button) {
        const itemRow = button.closest('.item-row');
        const container = document.getElementById('itemsContainer');

        if (container && container.children.length > 1) {
            itemRow.remove();
            this.calculateTotals();
        }
    }

    calculateItemTotal(input) {
        const itemRow = input.closest('.item-row');
        const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
        const total = quantity * price;

        itemRow.querySelector('.item-total').value = total.toFixed(2);
        this.calculateTotals();
    }

    calculateTotals() {
        const itemRows = document.querySelectorAll('.item-row');
        let subtotal = 0;

        itemRows.forEach(row => {
            const total = parseFloat(row.querySelector('.item-total').value) || 0;
            subtotal += total;
        });

        const taxRateEl = document.getElementById('taxRate');
        const taxRate = taxRateEl ? (parseFloat(taxRateEl.value) || 0) : 0;
        const taxAmount = (subtotal * taxRate) / 100;
        const total = subtotal + taxAmount;

        const subtotalEl = document.getElementById('subtotal');
        const taxAmountEl = document.getElementById('taxAmount');
        const totalAmountEl = document.getElementById('totalAmount');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (taxAmountEl) taxAmountEl.textContent = `$${taxAmount.toFixed(2)}`;
        if (totalAmountEl) totalAmountEl.textContent = `$${total.toFixed(2)}`;
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const items = this.getItemsFromForm();

        if (items.length === 0) {
            this.showNotification('Please add at least one item to the invoice.', 'error');
            return;
        }

        const customerName = document.getElementById('customerName').value.trim();
        const customerEmail = document.getElementById('customerEmail').value.trim();

        if (!customerName || !customerEmail) {
            this.showNotification('Customer name and email are required.', 'error');
            return;
        }

        const invoiceData = {
            user_id: this.userId,
            invoiceNumber: document.getElementById('invoiceNumber').value,
            invoiceDate: document.getElementById('invoiceDate').value,
            dueDate: document.getElementById('dueDate').value,
            customerName,
            customerEmail,
            customerAddress: document.getElementById('customerAddress').value,
            items: items,
            subtotal: parseFloat(document.getElementById('subtotal').textContent.replace('$', '')),
            taxRate: parseFloat(document.getElementById('taxRate').value) || 0,
            taxAmount: parseFloat(document.getElementById('taxAmount').textContent.replace('$', '')),
            total: parseFloat(document.getElementById('totalAmount').textContent.replace('$', '')),
            status: document.getElementById('status').value,
            notes: document.getElementById('notes').value
        };

        try {
            if (this.currentEditingId) {
                await this.updateInvoice(this.currentEditingId, invoiceData);
            } else {
                await this.addInvoice(invoiceData);
            }

            this.closeModal();
            await this.loadInvoices();
            this.updateStatistics();
        } catch (error) {
            console.error('Form submit error:', error);
            const errorMessage = error.message || 'Failed to save invoice. Please check the console for details.';
            this.showNotification(errorMessage, 'error');
        }
    }

    getItemsFromForm() {
        const items = [];
        const itemRows = document.querySelectorAll('.item-row');

        itemRows.forEach(row => {
            const description = row.querySelector('.item-description').value.trim();
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const total = parseFloat(row.querySelector('.item-total').value) || 0;

            if (description && quantity > 0 && price >= 0) {
                items.push({
                    description,
                    quantity,
                    price,
                    total
                });
            }
        });

        return items;
    }

    async addInvoice(invoiceData) {
        try {
            if (!invoiceData.customerName || !invoiceData.customerEmail) {
                throw new Error('Customer name and email are required');
            }

            // Create or get customer
            let customerId = await this.getOrCreateCustomer(invoiceData.customerName, invoiceData.customerEmail);
            if (!customerId) {
                throw new Error('Failed to create or find customer. Please check customer details.');
            }

            // Map frontend status to DB expectations handled on backend; keep semantic here
            const statusMap = {
                'paid': 'paid',
                'unpaid': 'unpaid',
                'overdue': 'overdue',
                'draft': 'unpaid',
                'sent': 'unpaid'
            };
            const mappedStatus = statusMap[invoiceData.status] || 'unpaid';

            const invoicePayload = {
                customer_id: customerId,
                total: invoiceData.total,
                status: mappedStatus
            };

            await ApiService.post('/invoices', invoicePayload);
            this.showNotification('Invoice created successfully!', 'success');
            await this.loadInvoices();
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    async updateInvoice(invoiceId, invoiceData) {
        try {
            if (!invoiceData.customerName || !invoiceData.customerEmail) {
                throw new Error('Customer name and email are required');
            }

            let customerId = await this.getOrCreateCustomer(invoiceData.customerName, invoiceData.customerEmail);
            if (!customerId) {
                throw new Error('Failed to create or find customer.');
            }

            const statusMap = {
                'paid': 'paid',
                'unpaid': 'unpaid',
                'overdue': 'overdue',
                'draft': 'unpaid',
                'sent': 'unpaid'
            };
            const mappedStatus = statusMap[invoiceData.status] || 'unpaid';

            const invoicePayload = {
                customer_id: customerId,
                total: invoiceData.total,
                status: mappedStatus
            };

            await ApiService.put(`/invoices/${invoiceId}`, invoicePayload);
            this.showNotification('Invoice updated successfully!', 'success');
            await this.loadInvoices();
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    async deleteInvoice(invoiceId) {
        try {
            await ApiService.delete(`/invoices/${invoiceId}`);
            this.invoices = this.invoices.filter(inv => inv.id !== invoiceId);
            this.renderInvoices();
            this.updateStatistics();
            this.closeDeleteModal();
            this.showNotification('Invoice deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    async getOrCreateCustomer(name, email) {
        try {
            if (!name || !email) {
                throw new Error('Customer name and email are required');
            }

            // Get existing customers for user
            let customers = await ApiService.get(`/customers/${this.userId}`);
            if (!Array.isArray(customers)) {
                console.warn('Unexpected customers response shape:', customers);
                customers = [];
            }

            let customer = customers.find(c => c.email === email);

            if (!customer) {
                // Create new customer
                const response = await ApiService.post('/customers', {
                    user_id: this.userId,
                    name: name,
                    email: email
                });

                console.log('Customer creation response:', response);

                let createdId = null;
                if (response && typeof response === 'object') {
                    if (response.id) {
                        createdId = response.id;
                    } else if (response.customer && response.customer.id) {
                        createdId = response.customer.id;
                        customer = response.customer;
                    } else if (response.data && response.data.id) {
                        createdId = response.data.id;
                        customer = response.data;
                    }
                }

                if (createdId && !customer) {
                    customer = { id: createdId, email, name };
                }

                if (!customer) {
                    const updatedCustomers = await ApiService.get(`/customers/${this.userId}`);
                    if (Array.isArray(updatedCustomers)) {
                        customer = updatedCustomers.find(c => c.email === email);
                    }
                }

                if (!customer) {
                    const statusText = (response && response.status) ? `status: ${response.status}` : 'no customer payload';
                    throw new Error(`Customer was created but could not be retrieved (${statusText}).`);
                }
            }

            return customer.id;
        } catch (error) {
            console.error('Error managing customer:', error);
            throw new Error(`Customer error: ${error.message}`);
        }
    }

    async loadInvoices() {
        try {
            const invoices = await ApiService.get(`/invoices/${this.userId}`);

            this.invoices = invoices.map(inv => {
                const statusMap = {
                    'Paid': 'paid',
                    'Unpaid': 'unpaid',
                    'Overdue': 'overdue'
                };

                return {
                    id: inv.id,
                    userId: inv.user_id,
                    invoiceNumber: `INV-${inv.id.toString().padStart(4, '0')}`,
                    invoiceDate: inv.created_at || new Date().toISOString().split('T')[0],
                    dueDate: inv.created_at || new Date().toISOString().split('T')[0],
                    customerName: inv.customer_name || '',
                    customerEmail: inv.customer_email || '',
                    customerAddress: '',
                    items: [],
                    subtotal: parseFloat(inv.total) || 0,
                    taxRate: 0,
                    taxAmount: 0,
                    total: parseFloat(inv.total) || 0,
                    status: statusMap[inv.status] || 'unpaid',
                    notes: '',
                    createdAt: inv.created_at,
                    updatedAt: inv.created_at
                };
            });
            this.renderInvoices();
        } catch (error) {
            console.error('Error loading invoices:', error);
            this.showNotification('Failed to load invoices', 'error');
        }
    }

    confirmDelete() {
        if (this.currentEditingId) {
            this.deleteInvoice(this.currentEditingId);
        }
    }

    renderInvoices() {
        const userInvoices = this.invoices.filter(inv => inv.userId === this.userId);
        const tbody = document.getElementById('invoicesTableBody');
        const noInvoices = document.getElementById('noInvoices');

        if (!tbody || !noInvoices) return;

        if (userInvoices.length === 0) {
            tbody.innerHTML = '';
            noInvoices.style.display = 'block';
            return;
        }

        noInvoices.style.display = 'none';

        tbody.innerHTML = userInvoices.map(invoice => `
            <tr>
                <td><strong>${invoice.invoiceNumber}</strong></td>
                <td>
                    <div>
                        <strong>${invoice.customerName}</strong><br>
                        <small class="text-muted">${invoice.customerEmail}</small>
                    </div>
                </td>
                <td>${this.formatDate(invoice.invoiceDate)}</td>
                <td>${this.formatDate(invoice.dueDate)}</td>
                <td><strong>$${invoice.total.toFixed(2)}</strong></td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="window.invoiceManager.openModal('${invoice.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete-btn" onclick="window.invoiceManager.openDeleteModal('${invoice.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterInvoices() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const dateFilter = document.getElementById('dateFilter')?.value || '';

        let filteredInvoices = this.invoices.filter(inv => inv.userId === this.userId);

        if (searchTerm) {
            filteredInvoices = filteredInvoices.filter(invoice =>
                invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
                invoice.customerName.toLowerCase().includes(searchTerm) ||
                invoice.customerEmail.toLowerCase().includes(searchTerm)
            );
        }

        if (statusFilter) {
            filteredInvoices = filteredInvoices.filter(invoice => invoice.status === statusFilter);
        }

        if (dateFilter) {
            const now = new Date();
            filteredInvoices = filteredInvoices.filter(invoice => {
                const invoiceDate = new Date(invoice.invoiceDate);

                switch (dateFilter) {
                    case 'today':
                        return invoiceDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return invoiceDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return invoiceDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        this.renderFilteredInvoices(filteredInvoices);
    }

    renderFilteredInvoices(invoices) {
        const tbody = document.getElementById('invoicesTableBody');
        const noInvoices = document.getElementById('noInvoices');

        if (!tbody || !noInvoices) return;

        if (invoices.length === 0) {
            tbody.innerHTML = '';
            noInvoices.style.display = 'block';
            const h3 = noInvoices.querySelector('h3');
            const p = noInvoices.querySelector('p');
            if (h3) h3.textContent = 'No invoices found';
            if (p) p.textContent = 'Try adjusting your search or filter criteria';
            return;
        }

        noInvoices.style.display = 'none';

        tbody.innerHTML = invoices.map(invoice => `
            <tr>
                <td><strong>${invoice.invoiceNumber}</strong></td>
                <td>
                    <div>
                        <strong>${invoice.customerName}</strong><br>
                        <small class="text-muted">${invoice.customerEmail}</small>
                    </div>
                </td>
                <td>${this.formatDate(invoice.invoiceDate)}</td>
                <td>${this.formatDate(invoice.dueDate)}</td>
                <td><strong>$${invoice.total.toFixed(2)}</strong></td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="window.invoiceManager.openModal('${invoice.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete-btn" onclick="window.invoiceManager.openDeleteModal('${invoice.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateStatistics() {
        const userInvoices = this.invoices.filter(inv => inv.userId === this.userId);
        const totalInvoices = userInvoices.length;
        const totalAmount = userInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
        const pendingInvoices = userInvoices.filter(invoice =>
            invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'unpaid'
        ).length;
        const paidInvoices = userInvoices.filter(invoice =>
            invoice.status === 'paid'
        ).length;

        const totalInvoicesEl = document.getElementById('totalInvoices');
        const totalAmountEl = document.getElementById('totalAmount');
        const pendingInvoicesEl = document.getElementById('pendingInvoices');
        const paidInvoicesEl = document.getElementById('paidInvoices');

        if (totalInvoicesEl) totalInvoicesEl.textContent = totalInvoices;
        if (totalAmountEl) totalAmountEl.textContent = `$${totalAmount.toFixed(2)}`;
        if (pendingInvoicesEl) pendingInvoicesEl.textContent = pendingInvoices;
        if (paidInvoicesEl) paidInvoicesEl.textContent = paidInvoices;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
let authManager;
let themeManager;

document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
    authManager = new AuthManager();
});
