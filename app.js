// ======================
// Controlador del Formulario de Paciente
// ======================

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    const patientForm = document.getElementById('patientForm');
    
    if (patientForm) {
        patientForm.addEventListener('submit', manejarEnvioFormulario);
    } else {
        console.error('No se encontró el formulario de paciente');
    }
});

// Manejador principal del envío del formulario
async function manejarEnvioFormulario(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const botonEnviar = formulario.querySelector('button[type="submit"]');
    
    try {
        // Establecer estado de carga
        establecerBotonCargando(botonEnviar, true);
        
        // Obtener y validar datos del formulario
        const datosFormulario = obtenerValoresFormulario();
        const validacion = validarDatosFormulario(datosFormulario);
        
        if (!validacion.esValido) {
            mostrarAlerta('Error de Validación', validacion.mensaje, 'error');
            validacion.campo?.focus();
            return;
        }
        
        // Construir objeto Paciente FHIR
        const paciente = construirPacienteFHIR(datosFormulario);
        
        // Verificar duplicados
        const verificacionDuplicado = await verificarPacienteDuplicado(paciente);
        if (verificacionDuplicado.esDuplicado) {
            mostrarAlertaDuplicado(verificacionDuplicado);
            return;
        }
        
        // Enviar al backend
        const resultado = await enviarDatosPaciente(paciente);
        
        if (resultado.exito) {
            mostrarAlertaExito(resultado.idPaciente);
            formulario.reset();
        } else {
            throw new Error(resultado.mensaje || 'Error al crear el paciente');
        }
        
    } catch (error) {
        console.error('Error en el envío:', error);
        mostrarAlerta('Error', error.message || 'Ocurrió un error durante el envío', 'error');
    } finally {
        establecerBotonCargando(botonEnviar, false);
    }
}

// =================
// Funciones Auxiliares
// =================

function obtenerValoresFormulario() {
    return {
        nombre: obtenerValor('name'),
        apellido: obtenerValor('familyName'),
        genero: obtenerValor('gender'),
        fechaNacimiento: obtenerValor('birthDate'),
        tipoIdentificacion: obtenerValor('identifierSystem'),
        numeroIdentificacion: obtenerValor('identifierValue'),
        telefono: obtenerValor('cellPhone'),
        correo: obtenerValor('email'),
        direccion: obtenerValor('address'),
        ciudad: obtenerValor('city'),
        codigoPostal: obtenerValor('postalCode')
    };
    
    function obtenerValor(id) {
        const elemento = document.getElementById(id);
        return elemento ? elemento.value.trim() : '';
    }
}

function validarDatosFormulario(datosFormulario) {
    // Validación de campos requeridos
    const camposRequeridos = [
        { id: 'name', nombre: 'Nombre' },
        { id: 'familyName', nombre: 'Apellido' },
        { id: 'birthDate', nombre: 'Fecha de Nacimiento' },
        { id: 'identifierValue', nombre: 'Número de Identificación' },
        { id: 'cellPhone', nombre: 'Teléfono' }
    ];
    
    for (const campo of camposRequeridos) {
        if (!datosFormulario[campo.id]) {
            return {
                esValido: false,
                mensaje: `${campo.nombre} es requerido`,
                campo: document.getElementById(campo.id)
            };
        }
    }
    
    // Validación de email
    if (datosFormulario.correo && !esEmailValido(datosFormulario.correo)) {
        return {
            esValido: false,
            mensaje: 'Por favor ingrese un correo electrónico válido',
            campo: document.getElementById('email')
        };
    }
    
    return { esValido: true };
}

function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function construirPacienteFHIR(datosFormulario) {
    return {
        resourceType: "Patient",
        name: [{
            use: "official",
            given: [datosFormulario.nombre],
            family: datosFormulario.apellido
        }],
        gender: datosFormulario.genero,
        birthDate: datosFormulario.fechaNacimiento,
        identifier: [{
            system: datosFormulario.tipoIdentificacion,
            value: datosFormulario.numeroIdentificacion
        }],
        telecom: [
            { system: "phone", value: datosFormulario.telefono, use: "home" },
            { system: "email", value: datosFormulario.correo, use: "home" }
        ],
        address: [{
            use: "home",
            line: [datosFormulario.direccion],
            city: datosFormulario.ciudad,
            postalCode: datosFormulario.codigoPostal,
            country: "Colombia"
        }]
    };
}

async function verificarPacienteDuplicado(paciente) {
    try {
        const respuesta = await fetch('https://back-end-santiago.onrender.com/patient/check-duplicate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(paciente)
        });
        
        if (!respuesta.ok) {
            throw new Error(`El servidor respondió con ${respuesta.status}`);
        }
        
        const datos = await respuesta.json();
        
        return {
            esDuplicado: datos.isDuplicate || false,
            tipoCoincidencia: datos.matchType || null,
            idExistente: datos.existingId || null
        };
        
    } catch (error) {
        console.error('Error en verificación de duplicado:', error);
        return { esDuplicado: false };
    }
}

async function enviarDatosPaciente(paciente) {
    const respuesta = await fetch('https://back-end-santiago.onrender.com/patient', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(paciente)
    });
    
    const datos = await respuesta.json();
    
    if (!respuesta.ok) {
        throw new Error(datos.detail || datos.message || 'Error en el envío');
    }
    
    return {
        exito: datos.status === "success",
        idPaciente: datos.patient_id || datos.insertedId,
        mensaje: datos.message
    };
}

// ==============
// Funciones de UI
// ==============

function establecerBotonCargando(boton, estaCargando) {
    if (estaCargando) {
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Procesando...';
    } else {
        boton.disabled = false;
        boton.textContent = 'Registrar Paciente';
    }
}

function mostrarAlerta(titulo, mensaje, tipo = 'info') {
    // Intentar con SweetAlert2 primero, luego con alerta del navegador
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: titulo,
            text: mensaje,
            icon: tipo,
            confirmButtonText: 'OK'
        });
    } else {
        alert(`${titulo}\n\n${mensaje}`);
    }
}

function mostrarAlertaDuplicado(resultado) {
    const tipoCoincidencia = resultado.tipoCoincidencia === 'identifier' 
        ? 'número de identificación' 
        : 'nombre y fecha de nacimiento';
    
    mostrarAlerta(
        'Paciente ya existe',
        `Ya existe un paciente con el mismo ${tipoCoincidencia}.\n\nID del paciente existente: ${resultado.idExistente}`,
        'warning'
    );
}

function mostrarAlertaExito(idPaciente) {
    mostrarAlerta(
        'Registro Exitoso',
        `¡Paciente registrado correctamente!\n\nID del paciente: ${idPaciente}`,
        'success'
    );
}