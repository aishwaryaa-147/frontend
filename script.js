// Invoice Management System with Authentication JavaScript

// API Configuration
const API_BASE_URL = 'http://localhost:5500/api';

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
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:5500');
            }
            
            // Re-throw with more context
            if (error.message) {
                throw error;
            }
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
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('themeToggleAuth').addEventListener('click', () => this.toggleTheme());
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
        document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupFormElement').addEventListener('submit', (e) => this.handleSignup(e));
        
        document.getElementById('showSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
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
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('addInvoiceBtn').style.display = 'inline-flex';
        document.getElementById('themeToggle').style.display = 'inline-flex';
        document.getElementById('userName').textContent = this.currentUser.name;
        
        if (!window.invoiceManager) {
            window.invoiceManager = new InvoiceManager(this.currentUser.id);
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    }

    showSignupForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
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
        document.getElementById('addInvoiceBtn').addEventListener('click', () => this.openModal());
        document.getElementById('createFirstInvoice').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

        document.getElementById('invoiceForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        document.getElementById('addItem').addEventListener('click', () => this.addItemRow());
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

        document.getElementById('searchInput').addEventListener('input', (e) => this.filterInvoices());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterInvoices());
        document.getElementById('dateFilter').addEventListener('change', () => this.filterInvoices());

        document.getElementById('invoiceModal').addEventListener('click', (e) => {
            if (e.target.id === 'invoiceModal') {
                this.closeModal();
            }
        });

        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.closeDeleteModal();
            }
        });
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateString = dueDate.toISOString().split('T')[0];

        document.getElementById('invoiceDate').value = today;
        document.getElementById('dueDate').value = dueDateString;
    }

    generateInvoiceNumber() {
        const userInvoices = this.invoices.filter(inv => inv.userId === this.userId);
        const lastInvoice = userInvoices[userInvoices.length - 1];
        let nextNumber = 1;
        
        if (lastInvoice && lastInvoice.invoiceNumber) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) || 0;
            nextNumber = lastNumber + 1;
        }
        
        document.getElementById('invoiceNumber').value = `INV-${nextNumber.toString().padStart(4, '0')}`;
    }

    openModal(invoiceId = null) {
        this.currentEditingId = invoiceId;
        const modal = document.getElementById('invoiceModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (invoiceId) {
            modalTitle.textContent = 'Edit Invoice';
            this.populateForm(invoiceId);
        } else {
            modalTitle.textContent = 'New Invoice';
            this.resetForm();
            this.generateInvoiceNumber();
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('invoiceModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentEditingId = null;
    }

    openDeleteModal(invoiceId) {
        this.currentEditingId = invoiceId;
        const modal = document.getElementById('deleteModal');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentEditingId = null;
    }

    resetForm() {
        document.getElementById('invoiceForm').reset();
        this.setDefaultDates();
        this.clearItems();
        this.addItemRow();
        this.calculateTotals();
    }

    populateForm(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId && inv.userId === this.userId);
        if (!invoice) return;

        document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
        document.getElementById('invoiceDate').value = invoice.invoiceDate || '';
        document.getElementById('dueDate').value = invoice.dueDate || '';
        document.getElementById('customerName').value = invoice.customerName || invoice.customer || '';
        document.getElementById('customerEmail').value = invoice.customerEmail || '';
        document.getElementById('customerAddress').value = invoice.customerAddress || '';
        document.getElementById('status').value = invoice.status || 'draft';
        document.getElementById('notes').value = invoice.notes || '';
        document.getElementById('taxRate').value = invoice.taxRate || 0;

        this.clearItems();
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                this.addItemRow(item);
            });
        } else {
            this.addItemRow();
        }

        this.calculateTotals();
    }

    clearItems() {
        const container = document.getElementById('itemsContainer');
        container.innerHTML = '';
    }

    addItemRow(item = null) {
        const container = document.getElementById('itemsContainer');
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
        
        if (container.children.length > 1) {
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
        
        const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
        const taxAmount = (subtotal * taxRate) / 100;
        const total = subtotal + taxAmount;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('taxAmount').textContent = `$${taxAmount.toFixed(2)}`;
        document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const items = this.getItemsFromForm();
        
        if (items.length === 0) {
            this.showNotification('Please add at least one item to the invoice.', 'error');
            return;
        }
        
        const invoiceData = {
            user_id: this.userId,
            invoiceNumber: document.getElementById('invoiceNumber').value,
            invoiceDate: document.getElementById('invoiceDate').value,
            dueDate: document.getElementById('dueDate').value,
            customerName: document.getElementById('customerName').value,
            customerEmail: document.getElementById('customerEmail').value,
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
            // First, create or get customer
            let customerId = await this.getOrCreateCustomer(invoiceData.customerName, invoiceData.customerEmail);
            
            if (!customerId) {
                throw new Error('Failed to create or find customer. Please check customer details.');
            }
            
            // Map frontend status to match database expectations
            const statusMap = {
                'paid': 'paid',
                'unpaid': 'unpaid',
                'overdue': 'overdue',
                'draft': 'unpaid',
                'sent': 'unpaid'
            };
            const mappedStatus = statusMap[invoiceData.status] || 'unpaid';
            
            // Create invoice with backend structure (matching actual DB schema)
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
            // Create or get customer
            let customerId = await this.getOrCreateCustomer(invoiceData.customerName, invoiceData.customerEmail);
            
            if (!customerId) {
                throw new Error('Failed to create or find customer.');
            }
            
            // Map frontend status
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

            // Try to get existing customer
            const customers = await ApiService.get(`/customers/${this.userId}`);
            let customer = customers.find(c => c.email === email);
            
            if (!customer) {
                // Create new customer
                const response = await ApiService.post('/customers', {
                    user_id: this.userId,
                    name: name,
                    email: email
                });
                
                // Get updated list to get the new customer ID
                const updatedCustomers = await ApiService.get(`/customers/${this.userId}`);
                customer = updatedCustomers.find(c => c.email === email);
                
                if (!customer) {
                    throw new Error('Customer was created but could not be retrieved');
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
            // Transform backend data to frontend format
            this.invoices = invoices.map(inv => {
                // Map database status back to frontend status
                const statusMap = {
                    'Paid': 'paid',
                    'Unpaid': 'unpaid',
                    'Overdue': 'overdue'
                };
                
                return {
                    id: inv.id,
                    userId: inv.user_id, // From joined customers table
                    invoiceNumber: `INV-${inv.id.toString().padStart(4, '0')}`, // Generate from ID
                    invoiceDate: inv.created_at || new Date().toISOString().split('T')[0],
                    dueDate: inv.created_at || new Date().toISOString().split('T')[0], // Use created_at as fallback
                    customerName: inv.customer_name || '',
                    customerEmail: inv.customer_email || '',
                    customerAddress: '', // Not stored in DB
                    items: [], // Not stored in DB - would need separate table
                    subtotal: parseFloat(inv.total) || 0,
                    taxRate: 0, // Not stored in DB
                    taxAmount: 0, // Not stored in DB
                    total: parseFloat(inv.total) || 0,
                    status: statusMap[inv.status] || 'unpaid',
                    notes: '', // Not stored in DB
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
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
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
        
        if (invoices.length === 0) {
            tbody.innerHTML = '';
            noInvoices.style.display = 'block';
            noInvoices.querySelector('h3').textContent = 'No invoices found';
            noInvoices.querySelector('p').textContent = 'Try adjusting your search or filter criteria';
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
            invoice.status === 'draft' || invoice.status === 'sent'
        ).length;
        const paidInvoices = userInvoices.filter(invoice => 
            invoice.status === 'paid'
        ).length;
        
        document.getElementById('totalInvoices').textContent = totalInvoices;
        document.getElementById('totalAmount').textContent = `$${totalAmount.toFixed(2)}`;
        document.getElementById('pendingInvoices').textContent = pendingInvoices;
        document.getElementById('paidInvoices').textContent = paidInvoices;
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