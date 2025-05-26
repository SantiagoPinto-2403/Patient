async function checkDuplicatePatient(patient) {
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Duplicate check failed:', error);
        return { isDuplicate: false }; // Continue with creation if check fails
    }
}

document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // [Previous form data collection code...]
    
    try {
        // First check for duplicates
        const duplicateResponse = await checkDuplicatePatient(patient);
        
        if (duplicateResponse.isDuplicate) {
            const matchType = duplicateResponse.matchType === 'identifier' ? 
                'número de identificación' : 'nombre y fecha de nacimiento';
            alert(`⚠️ Paciente ya existe (coincidencia por ${matchType})`);
            return;
        }

        // Create patient if no duplicates
        const response = await fetch('https://back-end-santiago.onrender.com/patient', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(patient)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error desconocido');
        }
        
        const result = await response.json();
        
        if (result.status === "exists") {
            alert(`⚠️ Paciente ya existe en el sistema (ID: ${result.existingId})`);
        } else if (result.status === "success") {
            alert(`✅ Paciente creado exitosamente! ID: ${result.insertedId}`);
            document.getElementById('patientForm').reset();
        } else {
            alert(`⚠️ Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`❌ Error al procesar la solicitud: ${error.message}`);
    }
});