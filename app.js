document.addEventListener('DOMContentLoaded', function() {
    const patientForm = document.getElementById('patientForm');
    
    if (patientForm) {
        patientForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Patient form not found');
    }
});

// Main form submission handler
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        // Set loading state
        setButtonLoading(submitBtn, true);
        
        // Get and validate form data
        const formData = getFormValues();
        const validation = validateFormData(formData);
        
        if (!validation.isValid) {
            showAlert('Validation Error', validation.message, 'error');
            validation.field?.focus();
            return;
        }
        
        // Build FHIR patient object
        const patient = buildFhirPatient(formData);
        
        // Check for duplicates
        const duplicateCheck = await checkForDuplicatePatient(patient);
        if (duplicateCheck.isDuplicate) {
            showDuplicateAlert(duplicateCheck);
            return;
        }
        
        // Submit to backend
        const result = await submitPatientData(patient);
        
        if (result.success) {
            showSuccessAlert(result.patientId);
            form.reset();
        } else {
            throw new Error(result.message || 'Failed to create patient');
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        showAlert('Error', error.message || 'An error occurred during submission', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// =================
// Helper Functions
// =================

function getFormValues() {
    return {
        name: getValue('name'),
        familyName: getValue('familyName'),
        gender: getValue('gender'),
        birthDate: getValue('birthDate'),
        identifierSystem: getValue('identifierSystem'),
        identifierValue: getValue('identifierValue'),
        cellPhone: getValue('cellPhone'),
        email: getValue('email'),
        address: getValue('address'),
        city: getValue('city'),
        postalCode: getValue('postalCode')
    };
    
    function getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    }
}

function validateFormData(formData) {
    // Required fields validation
    const requiredFields = [
        { id: 'name', name: 'First Name' },
        { id: 'familyName', name: 'Last Name' },
        { id: 'birthDate', name: 'Date of Birth' },
        { id: 'identifierValue', name: 'ID Number' },
        { id: 'cellPhone', name: 'Phone Number' }
    ];
    
    for (const field of requiredFields) {
        if (!formData[field.id]) {
            return {
                isValid: false,
                message: `${field.name} is required`,
                field: document.getElementById(field.id)
            };
        }
    }
    
    // Email validation
    if (formData.email && !isValidEmail(formData.email)) {
        return {
            isValid: false,
            message: 'Please enter a valid email address',
            field: document.getElementById('email')
        };
    }
    
    return { isValid: true };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildFhirPatient(formData) {
    return {
        resourceType: "Patient",
        name: [{
            use: "official",
            given: [formData.name],
            family: formData.familyName
        }],
        gender: formData.gender,
        birthDate: formData.birthDate,
        identifier: [{
            system: formData.identifierSystem,
            value: formData.identifierValue
        }],
        telecom: [
            { system: "phone", value: formData.cellPhone, use: "home" },
            { system: "email", value: formData.email, use: "home" }
        ],
        address: [{
            use: "home",
            line: [formData.address],
            city: formData.city,
            postalCode: formData.postalCode,
            country: "Colombia"
        }]
    };
}

async function checkForDuplicatePatient(patient) {
    try {
        const response = await fetch('https://back-end-santiago.onrender.com/patient/check-duplicate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(patient)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            isDuplicate: data.isDuplicate || false,
            matchType: data.matchType || null,
            existingId: data.existingId || null
        };
        
    } catch (error) {
        console.error('Duplicate check failed:', error);
        return { isDuplicate: false };
    }
}

async function submitPatientData(patient) {
    const response = await fetch('https://back-end-santiago.onrender.com/patient', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(patient)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.detail || data.message || 'Submission failed');
    }
    
    return {
        success: data.status === "success",
        patientId: data.patient_id || data.insertedId,
        message: data.message
    };
}

// ==============
// UI Functions
// ==============

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Processing...';
    } else {
        button.disabled = false;
        button.textContent = 'Register Patient';
    }
}

function showAlert(title, message, type = 'info') {
    // Try SweetAlert2 first, fall back to browser alert
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: type,
            confirmButtonText: 'OK'
        });
    } else {
        alert(`${title}\n\n${message}`);
    }
}

function showDuplicateAlert(result) {
    const matchType = result.matchType === 'identifier' 
        ? 'ID number' 
        : 'name and birth date';
    
    showAlert(
        'Patient Already Exists',
        `A patient with matching ${matchType} already exists.\n\nExisting Patient ID: ${result.existingId}`,
        'warning'
    );
}

function showSuccessAlert(patientId) {
    showAlert(
        'Registration Successful',
        `Patient registered successfully!\n\nPatient ID: ${patientId}`,
        'success'
    );
}