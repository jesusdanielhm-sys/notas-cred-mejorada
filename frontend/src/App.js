import React, { useState, useEffect } from 'react';
import './App.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { FileText, Plus, Settings, BarChart3, Edit, Trash2, Download, Printer, Upload, FileDown, TrendingUp, Package, Users, DollarSign, Clock, PieChart, Activity } from 'lucide-react';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  ComposedChart
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// LocalStorage utilities for offline functionality
const STORAGE_KEYS = {
  COMPANY_CONFIG: 'delivery_notes_company_config',
  CLIENTS: 'delivery_notes_clients',
  DELIVERY_NOTES: 'delivery_notes_delivery_notes',
  OFFLINE_MODE: 'delivery_notes_offline_mode'
};

const LocalStorageManager = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

// Generate UUID for offline mode
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Enhanced Dashboard Component
const EnhancedDashboard = ({ deliveryNotes = [], clients = [] }) => {
  // Procesamiento de datos reales
  const processRealData = () => {
    if (!deliveryNotes.length || !clients.length) {
      return {
        monthlyData: [],
        clientStats: [],
        statusData: []
      };
    }

    // Datos mensuales basados en tus notas reales
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthNotes = deliveryNotes.filter(note => {
        const noteDate = new Date(note.issue_date || note.created_at);
        return noteDate.getMonth() + 1 === month;
      });
      
      return {
        month: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
        notas: monthNotes.length,
        productos: monthNotes.reduce((acc, note) => acc + (note.products?.length || 0), 0)
      };
    });

    // Estadísticas de clientes reales
    const clientStats = clients.map(client => {
      const clientNotes = deliveryNotes.filter(note => 
        note.client_id === client.id || note.client_id === client._id
      );
      
      return {
        name: client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name,
        notes_count: clientNotes.length,
        products_count: clientNotes.reduce((acc, note) => acc + (note.products?.length || 0), 0)
      };
    }).sort((a, b) => b.notes_count - a.notes_count).slice(0, 5);

    // Como no tienes campo status, simulamos distribución
    const statusData = [
      { name: 'Entregado', value: Math.floor(deliveryNotes.length * 0.7), color: '#10B981' },
      { name: 'Pendiente', value: Math.floor(deliveryNotes.length * 0.2), color: '#F59E0B' },
      { name: 'En tránsito', value: Math.ceil(deliveryNotes.length * 0.1), color: '#3B82F6' }
    ];

    return { monthlyData, clientStats, statusData };
  };

  const { monthlyData, clientStats, statusData } = processRealData();

  // KPIs reales
  const totalNotes = deliveryNotes.length;
  const totalClients = clients.length;
  const avgNotesPerClient = totalClients > 0 ? (totalNotes / totalClients).toFixed(1) : 0;
  const totalProducts = deliveryNotes.reduce((acc, note) => acc + (note.products?.length || 0), 0);

  // Notas recientes
  const recentNotes = deliveryNotes
    .sort((a, b) => new Date(b.issue_date || b.created_at) - new Date(a.issue_date || a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Notas</p>
                <p className="text-3xl font-bold">{totalNotes}</p>
                <p className="text-blue-100 text-xs mt-1">Notas registradas</p>
              </div>
              <FileText className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Clientes</p>
                <p className="text-3xl font-bold">{totalClients}</p>
                <p className="text-green-100 text-xs mt-1">Clientes activos</p>
              </div>
              <Users className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Productos Total</p>
                <p className="text-3xl font-bold">{totalProducts}</p>
                <p className="text-purple-100 text-xs mt-1">{avgNotesPerClient} prom/cliente</p>
              </div>
              <Package className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Promedio/Nota</p>
                <p className="text-3xl font-bold">
                  {totalNotes > 0 ? (totalProducts / totalNotes).toFixed(1) : 0}
                </p>
                <p className="text-amber-100 text-xs mt-1">Productos por nota</p>
              </div>
              <BarChart3 className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {deliveryNotes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tendencia Mensual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendencia Mensual
              </CardTitle>
              <CardDescription>Evolución de notas y productos por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="notas" fill="#3B82F6" name="Notas" />
                  <Line type="monotone" dataKey="productos" stroke="#10B981" strokeWidth={3} name="Productos" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Estado de Entregas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Estado de Entregas
              </CardTitle>
              <CardDescription>Distribución estimada por estado</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <RechartsPieChart data={statusData}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RechartsPieChart>
                </RechartsPieChart>
              </ResponsiveContainer>
              
              <div className="flex justify-center mt-4 space-x-6">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Clientes */}
        {clientStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Clientes
              </CardTitle>
              <CardDescription>Clientes con mayor actividad</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clientStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="notes_count" fill="#3B82F6" name="Notas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Actividad Reciente */}
        {recentNotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Actividad Reciente
              </CardTitle>
              <CardDescription>Últimas notas creadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotes.map((note) => {
                  const client = clients.find(c => c.id === note.client_id || c._id === note.client_id);
                  return (
                    <div key={note.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{note.note_number}</p>
                        <p className="text-xs text-slate-600">{client?.name || 'Cliente no encontrado'}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(note.issue_date || note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {note.products?.length || 0} productos
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mensaje si no hay datos */}
      {deliveryNotes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay notas de entrega</h3>
            <p className="text-gray-500">Crea tu primera nota de entrega para ver las estadísticas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('notes');
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [companyConfig, setCompanyConfig] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form states
  const [newNote, setNewNote] = useState({
    client_id: '',
    delivery_location: {
      address: '',
      contact_person: '',
      phone: ''
    },
    products: [{ description: '', package_unit: '', package_quantity: 0, sale_unit: '', sale_quantity: 0 }],
    transport: ''
  });

  const [newClient, setNewClient] = useState({
    name: '',
    rif_ci: '',
    address: '',
    payment_condition: ''
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    rif: '',
    address: '',
    phone: ''
  });

  // Load data on component mount
  useEffect(() => {
    checkOfflineMode();
    loadDeliveryNotes();
    loadClients();
    loadCompanyConfig();
    loadStatistics();
  }, []);

  const checkOfflineMode = () => {
    const offlineMode = LocalStorageManager.get(STORAGE_KEYS.OFFLINE_MODE) || false;
    setIsOfflineMode(offlineMode);
  };

  const toggleOfflineMode = () => {
    const newOfflineMode = !isOfflineMode;
    setIsOfflineMode(newOfflineMode);
    LocalStorageManager.set(STORAGE_KEYS.OFFLINE_MODE, newOfflineMode);
    
    if (newOfflineMode) {
      syncToLocalStorage();
      toast({
        title: "Modo Offline Activado",
        description: "Los datos se guardarán localmente en tu navegador",
      });
    } else {
      toast({
        title: "Modo Online Activado",
        description: "Los datos se guardarán en el servidor",
      });
    }
  };

  const syncToLocalStorage = async () => {
    try {
      // Sync current data from server to localStorage
      const [notesRes, clientsRes, configRes] = await Promise.all([
        axios.get(`${API}/delivery-notes`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/company-config`)
      ]);

      LocalStorageManager.set(STORAGE_KEYS.DELIVERY_NOTES, notesRes.data);
      LocalStorageManager.set(STORAGE_KEYS.CLIENTS, clientsRes.data);
      LocalStorageManager.set(STORAGE_KEYS.COMPANY_CONFIG, configRes.data);
    } catch (error) {
      console.log("Error syncing to localStorage:", error);
    }
  };

  const loadDeliveryNotes = async () => {
    try {
      if (isOfflineMode) {
        const notes = LocalStorageManager.get(STORAGE_KEYS.DELIVERY_NOTES) || [];
        setDeliveryNotes(notes);
      } else {
        const response = await axios.get(`${API}/delivery-notes`);
        setDeliveryNotes(response.data);
      }
    } catch (error) {
      // Fallback to offline mode if server is unreachable
      const notes = LocalStorageManager.get(STORAGE_KEYS.DELIVERY_NOTES) || [];
      setDeliveryNotes(notes);
      if (!isOfflineMode) {
        setIsOfflineMode(true);
        LocalStorageManager.set(STORAGE_KEYS.OFFLINE_MODE, true);
        toast({
          title: "Servidor no disponible",
          description: "Cambiado a modo offline automáticamente",
          variant: "destructive",
        });
      }
    }
  };

  const loadClients = async () => {
    try {
      if (isOfflineMode) {
        const clientsData = LocalStorageManager.get(STORAGE_KEYS.CLIENTS) || [];
        setClients(clientsData);
      } else {
        const response = await axios.get(`${API}/clients`);
        setClients(response.data);
      }
    } catch (error) {
      const clientsData = LocalStorageManager.get(STORAGE_KEYS.CLIENTS) || [];
      setClients(clientsData);
    }
  };

  const loadCompanyConfig = async () => {
    try {
      if (isOfflineMode) {
        const config = LocalStorageManager.get(STORAGE_KEYS.COMPANY_CONFIG);
        if (config) {
          setCompanyConfig(config);
          setCompanyForm(config);
        }
      } else {
        const response = await axios.get(`${API}/company-config`);
        if (response.data) {
          setCompanyConfig(response.data);
          setCompanyForm(response.data);
        }
      }
    } catch (error) {
      const config = LocalStorageManager.get(STORAGE_KEYS.COMPANY_CONFIG);
      if (config) {
        setCompanyConfig(config);
        setCompanyForm(config);
      }
    }
  };

  const loadStatistics = async () => {
    try {
      if (isOfflineMode) {
        const notes = LocalStorageManager.get(STORAGE_KEYS.DELIVERY_NOTES) || [];
        const clientsData = LocalStorageManager.get(STORAGE_KEYS.CLIENTS) || [];
        
        const clientStats = {};
        notes.forEach(note => {
          const clientName = note.client_info?.name || 'Desconocido';
          clientStats[clientName] = (clientStats[clientName] || 0) + 1;
        });

        const notesByClient = Object.entries(clientStats).map(([name, count]) => ({
          _id: name,
          count
        }));

        setStatistics({
          total_notes: notes.length,
          total_clients: clientsData.length,
          notes_by_client: notesByClient
        });
      } else {
        const response = await axios.get(`${API}/statistics`);
        setStatistics(response.data);
      }
    } catch (error) {
      console.log("Error loading statistics");
    }
  };

  const createClient = async () => {
    try {
      if (isOfflineMode) {
        const clientToCreate = {
          id: generateUUID(),
          ...newClient,
          last_note_number: 0,
          created_at: new Date().toISOString()
        };
        
        const existingClients = LocalStorageManager.get(STORAGE_KEYS.CLIENTS) || [];
        const updatedClients = [...existingClients, clientToCreate];
        LocalStorageManager.set(STORAGE_KEYS.CLIENTS, updatedClients);
        setClients(updatedClients);
      } else {
        await axios.post(`${API}/clients`, newClient);
        loadClients();
      }
      
      setNewClient({ name: '', rif_ci: '', address: '', payment_condition: '' });
      toast({
        title: "Éxito",
        description: "Cliente creado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el cliente",
        variant: "destructive",
      });
    }
  };

  const createDeliveryNote = async () => {
    try {
      if (isOfflineMode) {
        const client = clients.find(c => c.id === newNote.client_id);
        if (!client) {
          toast({
            title: "Error",
            description: "Cliente no encontrado",
            variant: "destructive",
          });
          return;
        }

        const newNoteNumber = client.last_note_number + 1;
        const noteNumber = `${client.rif_ci}-${newNoteNumber.toString().padStart(3, '0')}`;

        const deliveryNote = {
          id: generateUUID(),
          note_number: noteNumber,
          issue_date: new Date().toISOString(),
          client_id: newNote.client_id,
          client_info: client,
          delivery_location: newNote.delivery_location,
          products: newNote.products,
          transport: newNote.transport,
          received_by_name: '',
          received_by_cedula: '',
          received_date: null,
          created_at: new Date().toISOString()
        };

        // Update client's last note number
        const updatedClients = clients.map(c => 
          c.id === client.id ? { ...c, last_note_number: newNoteNumber } : c
        );
        LocalStorageManager.set(STORAGE_KEYS.CLIENTS, updatedClients);
        setClients(updatedClients);

        // Save delivery note
        const existingNotes = LocalStorageManager.get(STORAGE_KEYS.DELIVERY_NOTES) || [];
        const updatedNotes = [...existingNotes, deliveryNote];
        LocalStorageManager.set(STORAGE_KEYS.DELIVERY_NOTES, updatedNotes);
        setDeliveryNotes(updatedNotes);
      } else {
        await axios.post(`${API}/delivery-notes`, newNote);
        loadDeliveryNotes();
      }
      
      setNewNote({
        client_id: '',
        delivery_location: { address: '', contact_person: '', phone: '' },
        products: [{ description: '', package_unit: '', package_quantity: 0, sale_unit: '', sale_quantity: 0 }],
        transport: ''
      });
      
      loadStatistics();
      toast({
        title: "Éxito",
        description: "Nota de entrega creada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la nota de entrega",
        variant: "destructive",
      });
    }
  };

  const saveCompanyConfig = async () => {
    try {
      if (isOfflineMode) {
        const config = {
          id: companyConfig?.id || generateUUID(),
          ...companyForm,
          created_at: companyConfig?.created_at || new Date().toISOString()
        };
        LocalStorageManager.set(STORAGE_KEYS.COMPANY_CONFIG, config);
        setCompanyConfig(config);
      } else {
        await axios.post(`${API}/company-config`, companyForm);
        loadCompanyConfig();
      }
      
      toast({
        title: "Éxito",
        description: "Configuración de empresa guardada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  const uploadLogo = async (file) => {
    try {
      if (isOfflineMode) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const logoDataUrl = e.target.result;
          
          // Asegurar que tenemos una configuración base si no existe
          const baseConfig = companyConfig || {
            id: generateUUID(),
            name: '',
            rif: '',
            address: '',
            phone: '',
            created_at: new Date().toISOString()
          };
          
          const updatedConfig = { ...baseConfig, logo: logoDataUrl };
          LocalStorageManager.set(STORAGE_KEYS.COMPANY_CONFIG, updatedConfig);
          setCompanyConfig(updatedConfig);
          
          // También actualizar el formulario para mostrar los cambios
          setCompanyForm({ ...companyForm, ...updatedConfig });
          
          toast({
            title: "Éxito",
            description: "Logo subido exitosamente",
          });
        };
        reader.readAsDataURL(file);
      } else {
        const formData = new FormData();
        formData.append('file', file);
        
        await axios.post(`${API}/company-config/logo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        loadCompanyConfig();
        toast({
          title: "Éxito",
          description: "Logo subido exitosamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el logo",
        variant: "destructive",
      });
    }
  };

  const addProduct = () => {
    setNewNote({
      ...newNote,
      products: [...newNote.products, { description: '', package_unit: '', package_quantity: 0, sale_unit: '', sale_quantity: 0 }]
    });
  };

  const removeProduct = (index) => {
    const products = newNote.products.filter((_, i) => i !== index);
    setNewNote({ ...newNote, products });
  };

  const updateProduct = (index, field, value) => {
    const products = [...newNote.products];
    products[index][field] = value;
    setNewNote({ ...newNote, products });
  };

  const deleteDeliveryNote = async (noteId) => {
    try {
      if (isOfflineMode) {
        const updatedNotes = deliveryNotes.filter(note => note.id !== noteId);
        LocalStorageManager.set(STORAGE_KEYS.DELIVERY_NOTES, updatedNotes);
        setDeliveryNotes(updatedNotes);
      } else {
        await axios.delete(`${API}/delivery-notes/${noteId}`);
        loadDeliveryNotes();
      }
      
      loadStatistics();
      toast({
        title: "Éxito",
        description: "Nota de entrega eliminada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota de entrega",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (note) => {
    setSelectedNote(note);
    setEditDialogOpen(true);
  };

  const updateDeliveryNote = async () => {
    try {
      if (isOfflineMode) {
        const updatedNotes = deliveryNotes.map(note =>
          note.id === selectedNote.id ? selectedNote : note
        );
        LocalStorageManager.set(STORAGE_KEYS.DELIVERY_NOTES, updatedNotes);
        setDeliveryNotes(updatedNotes);
      } else {
        const updateData = {
          client_id: selectedNote.client_id,
          delivery_location: selectedNote.delivery_location,
          products: selectedNote.products,
          transport: selectedNote.transport
        };
        await axios.put(`${API}/delivery-notes/${selectedNote.id}`, updateData);
        loadDeliveryNotes();
      }
      
      setEditDialogOpen(false);
      toast({
        title: "Éxito",
        description: "Nota de entrega actualizada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la nota de entrega",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = (note) => {
    const printContent = generatePrintContent(note);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Nota de Entrega - ${note.note_number}</title>
          <style>
            @media print {
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .no-print { display: none !important; }
              table { border-collapse: collapse; width: 100%; }
              table, th, td { border: 1px solid #000; }
              th, td { padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; margin-right: 10px;">Imprimir/PDF</button>
            <button onclick="window.close()" style="padding: 10px 20px;">Cerrar</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToWord = (note) => {
    const content = generatePrintContent(note, 'word');
    const blob = new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nota_${note.note_number}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Éxito",
      description: "Archivo Word descargado exitosamente",
    });
  };

  const generatePrintContent = (note, format = 'html') => {
    const isWord = format === 'word';
    const stylePrefix = isWord ? '' : 'style="';
    const styleSuffix = isWord ? '' : '"';
    
    return `
      <div ${stylePrefix}font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;${styleSuffix}>
        <div ${stylePrefix}text-align: center; margin-bottom: 30px;${styleSuffix}>
          ${companyConfig?.logo && !isWord ? `<img src="${companyConfig.logo}" ${stylePrefix}max-height: 100px; margin-bottom: 10px;${styleSuffix}>` : ''}
          <h1 ${stylePrefix}margin: 0; font-size: 24px;${styleSuffix}>${companyConfig?.name || 'EMPRESA'}</h1>
          <p ${stylePrefix}margin: 5px 0;${styleSuffix}>RIF: ${companyConfig?.rif || ''}</p>
          <p ${stylePrefix}margin: 5px 0;${styleSuffix}>${companyConfig?.address || ''}</p>
          <p ${stylePrefix}margin: 5px 0;${styleSuffix}>Teléfono: ${companyConfig?.phone || ''}</p>
        </div>
        
        <h2 ${stylePrefix}text-align: center; margin-bottom: 30px;${styleSuffix}>NOTA DE ENTREGA</h2>
        <p ${stylePrefix}text-align: right; margin-bottom: 20px;${styleSuffix}><strong>Número: ${note.note_number}</strong></p>
        <p ${stylePrefix}text-align: right; margin-bottom: 30px;${styleSuffix}><strong>Fecha Emisión: ${new Date(note.issue_date).toLocaleDateString()}</strong></p>
        
        <!-- Información del Cliente y Lugar de Entrega en dos columnas -->
        <div ${stylePrefix}display: flex; gap: 20px; margin-bottom: 30px;${styleSuffix}>
          <!-- Información del Cliente -->
          <div ${stylePrefix}flex: 1; border: 2px solid #333; padding: 15px; border-radius: 8px;${styleSuffix}>
            <h3 ${stylePrefix}margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;${styleSuffix}>INFORMACIÓN DEL CLIENTE</h3>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>Cliente:</strong> ${note.client_info.name}</p>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>R.I.F/C.I.:</strong> ${note.client_info.rif_ci}</p>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>Dirección:</strong> ${note.client_info.address}</p>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>Cond. Pago/Venc.:</strong> ${note.client_info.payment_condition}</p>
          </div>
          
          <!-- Lugar de Entrega -->
          <div ${stylePrefix}flex: 1; border: 2px solid #333; padding: 15px; border-radius: 8px;${styleSuffix}>
            <h3 ${stylePrefix}margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;${styleSuffix}>LUGAR DE ENTREGA</h3>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>Dirección:</strong> ${note.delivery_location.address}</p>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>Persona de contacto:</strong> ${note.delivery_location.contact_person}</p>
            <p ${stylePrefix}margin: 8px 0; font-size: 12px;${styleSuffix}><strong>Teléfono:</strong> ${note.delivery_location.phone}</p>
          </div>
        </div>
        
        <table ${stylePrefix}width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #333;${styleSuffix}>
          <thead>
            <tr ${stylePrefix}background-color: #f5f5f5;${styleSuffix}>
              <th ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; width: 40%;${styleSuffix}>DESCRIPCIÓN</th>
              <th ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; width: 15%;${styleSuffix}>EMPAQUE<br>UND</th>
              <th ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; width: 15%;${styleSuffix}>EMPAQUE<br>CANT</th>
              <th ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; width: 15%;${styleSuffix}>VENTA<br>UND</th>
              <th ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; width: 15%;${styleSuffix}>VENTA<br>CANT</th>
            </tr>
          </thead>
          <tbody>
            ${note.products.map(product => `
              <tr>
                <td ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: left; vertical-align: top;${styleSuffix}>${product.description}</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; vertical-align: top;${styleSuffix}>${product.package_unit}</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; vertical-align: top;${styleSuffix}>${product.package_quantity}</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; vertical-align: top;${styleSuffix}>${product.sale_unit}</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 10px; text-align: center; vertical-align: top;${styleSuffix}>${product.sale_quantity}</td>
              </tr>
            `).join('')}
            ${note.products.length < 5 ? Array(Math.min(3, 5 - note.products.length)).fill().map(() => `
              <tr>
                <td ${stylePrefix}border: 1px solid #333; padding: 15px; height: 25px;${styleSuffix}>&nbsp;</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 15px;${styleSuffix}>&nbsp;</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 15px;${styleSuffix}>&nbsp;</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 15px;${styleSuffix}>&nbsp;</td>
                <td ${stylePrefix}border: 1px solid #333; padding: 15px;${styleSuffix}>&nbsp;</td>
              </tr>
            `).join('') : ''}
          </tbody>
        </table>
        
        <div ${stylePrefix}border: 2px solid #333; padding: 15px; margin-bottom: 30px; border-radius: 8px;${styleSuffix}>
          <p ${stylePrefix}margin: 0; font-size: 12px;${styleSuffix}><strong>TRANSPORTE:</strong> ${note.transport || ''}</p>
        </div>
        
        <div ${stylePrefix}border: 2px solid #333; padding: 20px; margin-top: 30px; border-radius: 8px;${styleSuffix}>
          <h3 ${stylePrefix}margin: 0 0 20px 0; font-size: 14px; font-weight: bold; text-align: center; color: #333;${styleSuffix}>RECIBIDO CONFORME CLIENTE</h3>
          <div ${stylePrefix}display: flex; justify-content: space-between; align-items: end; margin-top: 40px;${styleSuffix}>
            <div ${stylePrefix}text-align: center; flex: 1;${styleSuffix}>
              <div ${stylePrefix}border-bottom: 2px solid #333; margin-bottom: 5px; height: 40px;${styleSuffix}></div>
              <p ${stylePrefix}margin: 0; font-size: 11px; font-weight: bold;${styleSuffix}>NOMBRE/FIRMA</p>
            </div>
            <div ${stylePrefix}text-align: center; flex: 1; margin: 0 20px;${styleSuffix}>
              <div ${stylePrefix}border-bottom: 2px solid #333; margin-bottom: 5px; height: 40px;${styleSuffix}></div>
              <p ${stylePrefix}margin: 0; font-size: 11px; font-weight: bold;${styleSuffix}>CÉDULA</p>
            </div>
            <div ${stylePrefix}text-align: center; flex: 1;${styleSuffix}>
              <div ${stylePrefix}border-bottom: 2px solid #333; margin-bottom: 5px; height: 40px;${styleSuffix}></div>
              <p ${stylePrefix}margin: 0; font-size: 11px; font-weight: bold;${styleSuffix}>FECHA</p>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const printNote = (note) => {
    const printContent = generatePrintContent(note);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Nota de Entrega - ${note.note_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              font-size: 12pt; 
              line-height: 1.4;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Sistema de Notas de Entrega</h1>
            <p className="text-slate-600">Gestiona tus notas de entrega de manera eficiente</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isOfflineMode ? "Modo Offline" : "Modo Online"}
              </span>
              <Button
                onClick={toggleOfflineMode}
                variant={isOfflineMode ? "secondary" : "default"}
                size="sm"
              >
                {isOfflineMode ? "🔒 Offline" : "🌐 Online"}
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas de Entrega
            </TabsTrigger>
            <TabsTrigger value="new-note" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva Nota
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Notas de Entrega Tab */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Notas de Entrega</CardTitle>
                <CardDescription>
                  Gestiona todas tus notas de entrega existentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell className="font-medium">{note.note_number}</TableCell>
                        <TableCell>{note.client_info.name}</TableCell>
                        <TableCell>{formatDate(note.issue_date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{note.products.length} productos</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printNote(note)}
                              title="Imprimir"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportToPDF(note)}
                              title="Exportar a PDF"
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportToWord(note)}
                              title="Exportar a Word"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(note)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteDeliveryNote(note.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nueva Nota Tab */}
          <TabsContent value="new-note">
            <div className="grid gap-6">
              {/* Crear Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Nuevo Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client-name">Nombre del Cliente</Label>
                      <Input
                        id="client-name"
                        value={newClient.name}
                        onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                        placeholder="CHEMYCALS'L C.A"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-rif">RIF/C.I.</Label>
                      <Input
                        id="client-rif"
                        value={newClient.rif_ci}
                        onChange={(e) => setNewClient({...newClient, rif_ci: e.target.value})}
                        placeholder="J-502964860"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="client-address">Dirección</Label>
                      <Textarea
                        id="client-address"
                        value={newClient.address}
                        onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                        placeholder="CR 36 ENTRE CALLES 23-24 SECTOR BARQUISIMETO CENTRO"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-condition">Condición de Pago</Label>
                      <Input
                        id="payment-condition"
                        value={newClient.payment_condition}
                        onChange={(e) => setNewClient({...newClient, payment_condition: e.target.value})}
                        placeholder="Crédito"
                      />
                    </div>
                  </div>
                  <Button onClick={createClient} className="mt-4">
                    Agregar Cliente
                  </Button>
                </CardContent>
              </Card>

              {/* Crear Nota de Entrega */}
              <Card>
                <CardHeader>
                  <CardTitle>Crear Nueva Nota de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Seleccionar Cliente */}
                  <div>
                    <Label htmlFor="select-client">Cliente</Label>
                    <Select value={newNote.client_id} onValueChange={(value) => setNewNote({...newNote, client_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.rif_ci}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lugar de Entrega */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Lugar de Entrega</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="delivery-address">Dirección</Label>
                        <Textarea
                          id="delivery-address"
                          value={newNote.delivery_location.address}
                          onChange={(e) => setNewNote({
                            ...newNote,
                            delivery_location: {...newNote.delivery_location, address: e.target.value}
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-person">Persona de Contacto</Label>
                        <Input
                          id="contact-person"
                          value={newNote.delivery_location.contact_person}
                          onChange={(e) => setNewNote({
                            ...newNote,
                            delivery_location: {...newNote.delivery_location, contact_person: e.target.value}
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-phone">Teléfono</Label>
                        <Input
                          id="contact-phone"
                          value={newNote.delivery_location.phone}
                          onChange={(e) => setNewNote({
                            ...newNote,
                            delivery_location: {...newNote.delivery_location, phone: e.target.value}
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Productos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Productos</h3>
                    {newNote.products.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-5 gap-4">
                          <div className="col-span-2">
                            <Label>Descripción</Label>
                            <Input
                              value={product.description}
                              onChange={(e) => updateProduct(index, 'description', e.target.value)}
                              placeholder="RESINA ESTIRENO PREFLEX 210"
                            />
                          </div>
                          <div>
                            <Label>Empaque UND</Label>
                            <Input
                              value={product.package_unit}
                              onChange={(e) => updateProduct(index, 'package_unit', e.target.value)}
                              placeholder="TAM"
                            />
                          </div>
                          <div>
                            <Label>Empaque CANT</Label>
                            <Input
                              type="number"
                              value={product.package_quantity}
                              onChange={(e) => updateProduct(index, 'package_quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Venta UND</Label>
                            <Input
                              value={product.sale_unit}
                              onChange={(e) => updateProduct(index, 'sale_unit', e.target.value)}
                              placeholder="Kg"
                            />
                          </div>
                          <div>
                            <Label>Venta CANT</Label>
                            <Input
                              type="number"
                              value={product.sale_quantity}
                              onChange={(e) => updateProduct(index, 'sale_quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        {newNote.products.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="mt-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button onClick={addProduct} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </div>

                  {/* Transporte */}
                  <div>
                    <Label htmlFor="transport">Transporte</Label>
                    <Input
                      id="transport"
                      value={newNote.transport}
                      onChange={(e) => setNewNote({...newNote, transport: e.target.value})}
                      placeholder="Información de transporte"
                    />
                  </div>

                  <Button onClick={createDeliveryNote} className="w-full">
                    Crear Nota de Entrega
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Dashboard Tab - AQUÍ ESTÁ LA INTEGRACIÓN */}
          <TabsContent value="statistics">
            <EnhancedDashboard 
              deliveryNotes={deliveryNotes}
              clients={clients}
            />
          </TabsContent>

          {/* Configuración Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Empresa</CardTitle>
                <CardDescription>
                  Configura los datos de tu empresa y sube tu logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div>
                  <Label htmlFor="logo-upload">Logo de la Empresa</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {companyConfig?.logo && (
                      <img src={companyConfig.logo} alt="Logo" className="h-20 w-20 object-contain border rounded" />
                    )}
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) uploadLogo(file);
                      }}
                      className="max-w-xs"
                    />
                  </div>
                </div>

                <Separator />

                {/* Datos de la empresa */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-name">Nombre de la Empresa</Label>
                    <Input
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                      placeholder="Nombre de tu empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-rif">RIF</Label>
                    <Input
                      id="company-rif"
                      value={companyForm.rif}
                      onChange={(e) => setCompanyForm({...companyForm, rif: e.target.value})}
                      placeholder="J-123456789"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="company-address">Dirección</Label>
                    <Textarea
                      id="company-address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                      placeholder="Dirección completa de tu empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Teléfono</Label>
                    <Input
                      id="company-phone"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                      placeholder="0212-1234567"
                    />
                  </div>
                </div>

                <Button onClick={saveCompanyConfig} className="w-full">
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Nota de Entrega</DialogTitle>
              <DialogDescription>
                Modifica los datos de la nota de entrega seleccionada
              </DialogDescription>
            </DialogHeader>
            
            {selectedNote && (
              <div className="space-y-6">
                {/* Lugar de Entrega */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Lugar de Entrega</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Dirección</Label>
                      <Textarea
                        value={selectedNote.delivery_location?.address || ''}
                        onChange={(e) => setSelectedNote({
                          ...selectedNote,
                          delivery_location: {
                            ...selectedNote.delivery_location,
                            address: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Persona de Contacto</Label>
                      <Input
                        value={selectedNote.delivery_location?.contact_person || ''}
                        onChange={(e) => setSelectedNote({
                          ...selectedNote,
                          delivery_location: {
                            ...selectedNote.delivery_location,
                            contact_person: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={selectedNote.delivery_location?.phone || ''}
                        onChange={(e) => setSelectedNote({
                          ...selectedNote,
                          delivery_location: {
                            ...selectedNote.delivery_location,
                            phone: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Productos</h3>
                  {selectedNote.products?.map((product, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-2">
                          <Label>Descripción</Label>
                          <Input
                            value={product.description}
                            onChange={(e) => {
                              const updatedProducts = [...selectedNote.products];
                              updatedProducts[index].description = e.target.value;
                              setSelectedNote({
                                ...selectedNote,
                                products: updatedProducts
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label>Empaque UND</Label>
                          <Input
                            value={product.package_unit}
                            onChange={(e) => {
                              const updatedProducts = [...selectedNote.products];
                              updatedProducts[index].package_unit = e.target.value;
                              setSelectedNote({
                                ...selectedNote,
                                products: updatedProducts
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label>Empaque CANT</Label>
                          <Input
                            type="number"
                            value={product.package_quantity}
                            onChange={(e) => {
                              const updatedProducts = [...selectedNote.products];
                              updatedProducts[index].package_quantity = parseInt(e.target.value) || 0;
                              setSelectedNote({
                                ...selectedNote,
                                products: updatedProducts
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label>Venta UND</Label>
                          <Input
                            value={product.sale_unit}
                            onChange={(e) => {
                              const updatedProducts = [...selectedNote.products];
                              updatedProducts[index].sale_unit = e.target.value;
                              setSelectedNote({
                                ...selectedNote,
                                products: updatedProducts
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label>Venta CANT</Label>
                          <Input
                            type="number"
                            value={product.sale_quantity}
                            onChange={(e) => {
                              const updatedProducts = [...selectedNote.products];
                              updatedProducts[index].sale_quantity = parseInt(e.target.value) || 0;
                              setSelectedNote({
                                ...selectedNote,
                                products: updatedProducts
                              });
                            }}
                          />
                        </div>
                      </div>
                      {selectedNote.products.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const updatedProducts = selectedNote.products.filter((_, i) => i !== index);
                            setSelectedNote({
                              ...selectedNote,
                              products: updatedProducts
                            });
                          }}
                          className="mt-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    onClick={() => {
                      const newProduct = { description: '', package_unit: '', package_quantity: 0, sale_unit: '', sale_quantity: 0 };
                      setSelectedNote({
                        ...selectedNote,
                        products: [...selectedNote.products, newProduct]
                      });
                    }}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>

                {/* Transporte */}
                <div>
                  <Label>Transporte</Label>
                  <Input
                    value={selectedNote.transport || ''}
                    onChange={(e) => setSelectedNote({
                      ...selectedNote,
                      transport: e.target.value
                    })}
                    placeholder="Información de transporte"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={updateDeliveryNote}>
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
