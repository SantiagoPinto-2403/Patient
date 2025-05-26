document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    try {
        // Disable button during processing
        submitButton.disabled = true;
        submitButton.textContent = 'Procesando...';
        
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error del servidor');
        }

        const result = await response.json();
        
        if (result.status === "exists") {
            const matchType = result.matchType === 'identifier' ? 
                'número de identificación' : 'nombre y fecha de nacimiento';
            alert(`⚠️ Paciente ya existe (coincidencia por ${matchType})\nID: ${result.existingId}`);
        } else if (result.status === "success") {
            alert(`✅ Paciente creado exitosamente!\nID: ${result.insertedId}`);
            document.getElementById('patientForm').reset();
        } else {
            throw new Error(result.message || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Registrar Paciente';
    }
});