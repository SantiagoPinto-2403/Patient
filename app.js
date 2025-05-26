// Controlador principal del formulario
document.addEventListener('DOMContentLoaded', function() {
    const formularioPaciente = document.getElementById('patientForm');
    const tituloFormulario = document.getElementById('form-title');
    
    if (formularioPaciente) {
        formularioPaciente.addEventListener('submit', manejarEnvioFormulario);
        
        // Configurar manejo de errores de validación
        formularioPaciente.querySelectorAll('[required]').forEach(campo => {
            campo.addEventListener('invalid', manejarValidacion);
            campo.addEventListener('input', limpiarError);
        });
    }

    function manejarValidacion(evento) {
        evento.preventDefault();
        const campo = evento.target;
        const mensaje = obtenerMensajeError(campo);
        mostrarError(campo, mensaje);
    }

    function obtenerMensajeError(campo) {
        if (campo.validity.valueMissing) {
            return `El campo ${campo.labels[0].textContent.replace(' *', '')} es requerido`;
        }
        if (campo.validity.typeMismatch && campo.type === 'email') {
            return 'Por favor ingrese un correo electrónico válido';
        }
        return 'Por favor complete este campo correctamente';
    }

    function mostrarError(campo, mensaje) {
        const grupo = campo.closest('.grupo-formulario');
        let elementoError = grupo.querySelector('.error-mensaje');
        
        if (!elementoError) {
            elementoError = document.createElement('p');
            elementoError.className = 'error-mensaje';
            elementoError.style.color = '#e74c3c';
            elementoError.style.marginTop = '5px';
            elementoError.style.fontSize = '0.9em';
            grupo.appendChild(elementoError);
        }
        
        elementoError.textContent = mensaje;
        campo.setAttribute('aria-invalid', 'true');
        tituloFormulario.textContent = `Error: ${mensaje}`;
    }

    function limpiarError(evento) {
        const campo = evento.target;
        campo.removeAttribute('aria-invalid');
        const grupo = campo.closest('.grupo-formulario');
        const elementoError = grupo.querySelector('.error-mensaje');
        if (elementoError) {
            elementoError.remove();
        }
    }

    async function manejarEnvioFormulario(evento) {
        evento.preventDefault();
        const formulario = evento.target;
        const botonEnviar = formulario.querySelector('button[type="submit"]');
        const textoOriginal = botonEnviar.innerHTML;
        
        try {
            // Validación inicial
            if (!formulario.checkValidity()) {
                formulario.reportValidity();
                return;
            }

            // Estado de carga
            botonEnviar.disabled = true;
            botonEnviar.innerHTML = '<span class="spinner"></span> Procesando...';
            tituloFormulario.textContent = 'Enviando información del paciente...';

            // Obtener datos
            const datosPaciente = obtenerDatosFormulario();

            // Verificar duplicados
            const existeDuplicado = await verificarPacienteExistente(datosPaciente);
            if (existeDuplicado) {
                mostrarAlertaDuplicado(existeDuplicado);
                return;
            }

            // Enviar datos
            const resultado = await enviarDatosPaciente(datosPaciente);
            
            if (resultado.exito) {
                mostrarAlertaExito(resultado.idPaciente);
                formulario.reset();
                tituloFormulario.textContent = 'Paciente registrado exitosamente';
            } else {
                throw new Error(resultado.mensaje || 'Error al registrar el paciente');
            }
        } catch (error) {
            console.error('Error en el envío:', error);
            mostrarAlertaError(error.message);
            tituloFormulario.textContent = `Error: ${error.message}`;
        } finally {
            botonEnviar.disabled = false;
            botonEnviar.innerHTML = textoOriginal;
        }
    }

    function obtenerDatosFormulario() {
        return {
            nombre: document.getElementById('name').value.trim(),
            apellido: document.getElementById('familyName').value.trim(),
            genero: document.getElementById('gender').value,
            fechaNacimiento: document.getElementById('birthDate').value,
            tipoIdentificacion: document.getElementById('identifierSystem').value,
            numeroIdentificacion: document.getElementById('identifierValue').value.trim(),
            telefono: document.getElementById('cellPhone').value.trim(),
            correo: document.getElementById('email').value.trim(),
            direccion: document.getElementById('address').value.trim(),
            ciudad: document.getElementById('city').value.trim(),
            codigoPostal: document.getElementById('postalCode').value.trim()
        };
    }

    async function verificarPacienteExistente(paciente) {
        try {
            const respuesta = await fetch('https://back-end-santiago.onrender.com/patient/check-duplicate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    identifier: [{
                        system: paciente.tipoIdentificacion,
                        value: paciente.numeroIdentificacion
                    }],
                    name: [{
                        given: [paciente.nombre],
                        family: paciente.apellido
                    }],
                    birthDate: paciente.fechaNacimiento
                })
            });

            if (!respuesta.ok) throw new Error('Error al verificar paciente');

            const datos = await respuesta.json();
            return datos.isDuplicate ? datos : null;

        } catch (error) {
            console.error('Error en verificación:', error);
            return null;
        }
    }

    async function enviarDatosPaciente(paciente) {
        const respuesta = await fetch('https://back-end-santiago.onrender.com/patient', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{
                    use: "official",
                    given: [paciente.nombre],
                    family: paciente.apellido
                }],
                gender: paciente.genero,
                birthDate: paciente.fechaNacimiento,
                identifier: [{
                    system: paciente.tipoIdentificacion,
                    value: paciente.numeroIdentificacion
                }],
                telecom: [
                    { system: "phone", value: paciente.telefono, use: "home" },
                    { system: "email", value: paciente.correo, use: "home" }
                ],
                address: [{
                    use: "home",
                    line: [paciente.direccion],
                    city: paciente.ciudad,
                    postalCode: paciente.codigoPostal,
                    country: "Colombia"
                }]
            })
        });

        const datos = await respuesta.json();
        
        if (!respuesta.ok) {
            throw new Error(datos.detail || datos.message || 'Error en el servidor');
        }

        return {
            exito: datos.status === "success",
            idPaciente: datos.patient_id || datos.insertedId,
            mensaje: datos.message
        };
    }

    // Funciones de UI
    function mostrarAlertaDuplicado(duplicado) {
        const tipo = duplicado.matchType === 'identifier' ? 
            'número de identificación' : 
            'nombre y fecha de nacimiento';
        
        mostrarAlerta(
            'Paciente Existente',
            `Ya existe un paciente con el mismo ${tipo}. ID: ${duplicado.existingId}`,
            'warning'
        );
    }

    function mostrarAlertaExito(idPaciente) {
        mostrarAlerta(
            'Registro Exitoso',
            `Paciente registrado correctamente. ID: ${idPaciente}`,
            'success'
        );
    }

    function mostrarAlertaError(mensaje) {
        mostrarAlerta('Error', mensaje, 'error');
    }

    function mostrarAlerta(titulo, mensaje, tipo) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: titulo,
                text: mensaje,
                icon: tipo,
                confirmButtonText: 'OK',
                confirmButtonColor: '#3498db'
            });
        } else {
            alert(`${titulo}\n\n${mensaje}`);
        }
    }
});