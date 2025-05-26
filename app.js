document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Get form values
    const formData = {
        name: document.getElementById('name').value,
        familyName: document.getElementById('familyName').value,
        gender: document.getElementById('gender').value,
        birthDate: document.getElementById('birthDate').value,
        identifierSystem: document.getElementById('identifierSystem').value,
        identifierValue: document.getElementById('identifierValue').value,
        cellPhone: document.getElementById('cellPhone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        postalCode: document.getElementById('postalCode').value
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

    try {
        // First check for duplicates
        const duplicateResponse = await checkDuplicatePatient(patient);
        
        if (duplicateResponse.isDuplicate) {
            const matchType = duplicateResponse.matchType === 'identifier' ? 
                'número de identificación' : 'nombre y fecha de nacimiento';
            alert(`Paciente ya existe (coincidencia por ${matchType})`);
            return;
        }

        // Create patient if no duplicates
        const response = await fetch('https://back-end-santiago.onrender.com/patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patient)
        });
        
        const result = await response.json();
        
        if (result.status === "exists") {
            alert(`Paciente ya existe en el sistema (ID: ${result.existingId})`);
        } else if (result.status === "success") {
            alert(`Paciente creado exitosamente! ID: ${result.insertedId}`);
            document.getElementById('patientForm').reset();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
    }
});

async function checkDuplicatePatient(patient) {
    const identifier = patient.identifier[0];
    const name = patient.name[0];
    
    const response = await fetch('https://back-end-santiago.onrender.com/patient/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            family_name: name.family,
            given_name: name.given[0],
            birth_date: patient.birthDate,
            identifier_system: identifier.system,
            identifier_value: identifier.value
        })
    });
    
    return await response.json();
}