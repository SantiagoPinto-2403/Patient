document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    const errorDisplay = document.getElementById('errorDisplay') || createErrorDisplay();
    
    try {
        // Disable button during processing
        submitButton.disabled = true;
        submitButton.textContent = 'Procesando...';
        errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';

        // Get form values
        const formData = {
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

        // Basic validation
        if (!formData.name || !formData.familyName || !formData.identifierValue) {
            throw new Error('Por favor complete todos los campos requeridos');
        }

        // Build FHIR Patient
        const patient = {
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

        // Create patient
        const response = await fetch('https://back-end-santiago.onrender.com/patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patient)
        });

        const result = await response.json();
        
        if (!response.ok) {
            // Handle HTTP errors (4xx, 5xx)
            throw new Error(result.message || `Error del servidor (${response.status})`);
        }

        // Process successful response
        if (result.status === "exists") {
            const matchType = result.matchType === 'identifier' ? 
                'número de identificación' : 'nombre y fecha de nacimiento';
            showMessage(`⚠️ Paciente ya existe (coincidencia por ${matchType})\nID: ${result.existingId}`, 'warning');
        } else if (result.status === "success") {
            showMessage(`✅ Paciente creado exitosamente!\nID: ${result.insertedId}`, 'success');
            document.getElementById('patientForm').reset();
        } else {
            throw new Error(result.message || 'Respuesta inesperada del servidor');
        }
    } catch (error) {
        console.error('Error:', error);
        errorDisplay.textContent = error.message;
        errorDisplay.style.display = 'block';
        errorDisplay.scrollIntoView({ behavior: 'smooth' });
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Registrar Paciente';
    }
});

// Helper functions
function createErrorDisplay() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorDisplay';
    errorDiv.style.color = 'red';
    errorDiv.style.margin = '10px 0';
    errorDiv.style.padding = '10px';
    errorDiv.style.border = '1px solid red';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.display = 'none';
    document.getElementById('patientForm').prepend(errorDiv);
    return errorDiv;
}

function showMessage(message, type) {
    const color = type === 'success' ? 'green' : 'orange';
    const icon = type === 'success' ? '✅' : '⚠️';
    alert(`${icon} ${message}`);
}