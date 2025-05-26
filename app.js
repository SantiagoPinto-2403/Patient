document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    try {
        // Disable button during processing
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

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
            throw new Error(result.message || `Server error (${response.status})`);
        }

        // Handle successful responses
        if (result.status === "success") {
            alert(`✅ Patient created successfully!\nID: ${result.patientId}`);
            document.getElementById('patientForm').reset();
        } 
        else if (result.status === "exists") {
            alert(`⚠️ Patient already exists with ID: ${result.patientId}`);
        }
        else {
            throw new Error(result.message || 'Unexpected server response');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Register Patient';
    }
});