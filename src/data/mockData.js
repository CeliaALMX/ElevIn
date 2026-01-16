export const MOCK_USER_PROFILE = {
  id: 99,
  name: 'Técnico Demo',
  role: 'Especialista en Mantenimiento',
  company: 'Elevadores MX',
  avatar: 'TD',
  bio: 'Técnico certificado con 5 años de experiencia en hidráulicos y tracción.',
  location: 'CDMX, México',
};

export const INITIAL_POSTS_DATA = [
  {
    id: 1,
    userId: 2,
    userName: 'Ing. Sofia Torres',
    userRole: 'Gerente de Proyectos',
    userAvatar: 'ST',
    content:
      'Hoy terminamos la instalación del equipo en Torre Reforma. ¡Un reto logístico increíble subir la máquina de tracción!  #Elevadores #Instalación',
    likes: 45,
    comments: 12,
    time: '2h',
    image: null,
  },
  {
    id: 2,
    userId: 1,
    userName: 'Carlos Técnico',
    userRole: 'Técnico de Mantenimiento',
    userAvatar: 'CT',
    content:
      '¿Alguien tiene el diagrama de una maniobra vieja de Thyssen? Me topé con un error 34 y no tengo el manual a la mano.',
    likes: 8,
    comments: 24,
    time: '4h',
    image: 'Diagrama solicitado',
  },
];

export const JOBS_DATA = [
  {
    id: 101,
    title: 'Técnico de Ruta',
    company: 'Vertical Solutions',
    location: 'Guadalajara, JAL',
    salary: '$18,000 - $22,000 MXN',
    type: 'Tiempo Completo',
    description:
      'Buscamos técnico con experiencia en marcas multimarca para ruta de mantenimiento preventivo.',
  },
  {
    id: 102,
    title: 'Ingeniero de Ajuste',
    company: 'KONE',
    location: 'Ciudad de México',
    salary: '$30,000 - $35,000 MXN',
    type: 'Tiempo Completo',
    description:
      'Encargado de la puesta en marcha de equipos nuevos y modernizaciones.',
  },
];
