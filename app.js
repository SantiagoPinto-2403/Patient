document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Show loading state
    const submitBtn = document.querySelector('#patientForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
    
    try {
        // 1. Get form values
        const formData = getFormValues();
        
        // 2. Validate required fields
        if (!validateForm(formData)) {
            return;
        }
        
        // 3. Build FHIR Patient object
        const patient = buildFhirPatient(formData);
        
        // 4. Check for duplicates
        const duplicateResult = await checkForDuplicatePatient(patient);
        if (duplicateResult.isDuplicate) {
            showDuplicateAlert(duplicateResult);
            return;
        }
        
        // 5. Create patient
        const creationResult = await createPatient(patient);
        handleCreationResult(creationResult);
        
    } catch (error) {
        console.error('Error:', error);
        showErrorAlert(error.message || 'An unknown error occurred');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register Patient';
    }
});

// Helper functions
function getFormValues() {
    return {
        name: document.getElementById('name').value.trim(),
        familyName: document.getElementById('familyName').value.trim(),
        gender: document.getElementById('gender').value,
        birthDate: document.getElementById('birthDate').value,
        identifierSystem: document.getElementById('identifierSystem').value,
        identifierValue: document.getElementById('identifierValue').value.trim(),
        cellPhone: document.getElementById('cellPhone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        postalCode: document.getElementById('postalCode').value.trim()
    };
}

function validateForm(formData) {
    // Check required fields
    const requiredFields = ['name', 'familyName', 'birthDate', 'identifierValue', 'cellPhone'];
    for (const field of requiredFields) {
        if (!formData[field]) {
            showErrorAlert(`Please fill in all required fields`);
            document.getElementById(field).focus();
            return false;
        }
    }
    
    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        showErrorAlert('Please enter a valid email address');
        document.getElementById('email').focus();
        return false;
    }
    
    return true;
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
            throw new Error(`Duplicate check failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Duplicate check error:', error);
        // Continue with creation if check fails
        return { isDuplicate: false };
    }
}

async function createPatient(patient) {
    const response = await fetch('https://back-end-santiago.onrender.com/patient', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(patient)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create patient');
    }
    
    return await response.json();
}

function showDuplicateAlert(duplicateResult) {
    const matchType = duplicateResult.matchType === 'identifier' 
        ? 'ID number' 
        : 'name and birth date';
    
    Swal.fire({
        icon: 'warning',
        title: 'Patient Already Exists',
        html: `A patient with matching ${matchType} already exists in the system.<br><br>
               Existing Patient ID: <strong>${duplicateResult.existingId}</strong>`,
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
    });
}

function handleCreationResult(result) {
    if (result.status === "success") {
        Swal.fire({
            icon: 'success',
            title: 'Patient Created!',
            html: `Patient registered successfully.<br><br>
                   Patient ID: <strong>${result.patient_id}</strong>`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
        }).then(() => {
            document.getElementById('patientForm').reset();
        });
    } else if (result.status === "exists") {
        showDuplicateAlert({
            isDuplicate: true,
            matchType: 'identifier',
            existingId: result.existing_id
        });
    } else {
        throw new Error(result.detail || 'Unknown response from server');
    }
}

function showErrorAlert(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
    });
}