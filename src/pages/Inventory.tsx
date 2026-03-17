import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  getInventoryList, 
  getStockMovementList, 
  getGudangBarangList,
  saveMasterData,
  deleteMasterData,
  restockInventory,
  mutasiInventory,
  getMasterList,
  DataBarang, 
  RiwayatBarang,
  GudangBarang
} from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { 
  Package, 
  AlertTriangle, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  Download, 
  Plus,
  ShoppingCart,
  Pencil,
  Trash,
  ArrowRightLeft,
  Calendar as CalendarIcon
} from "lucide-react";

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // State for Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DataBarang | null>(null);
  const [formData, setFormData] = useState<Partial<DataBarang>>({
    kode_brng: '',
    nama_brng: '',
    kode_sat: 'pcs',
    h_beli: '0',
    ralan: '0',
    stok: '0',
    stokminimal: '10',
    kdjns: '-',
    expire: format(new Date(), 'yyyy-MM-dd'),
    status: '1'
  });

  // State for Restock
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [restockFormData, setRestockFormData] = useState({
    kode_brng: '',
    kd_bangsal: '-',
    stok: '0',
    no_batch: '',
    no_faktur: '',
    harga: '0',
    keterangan: 'Pengadaan'
  });

  // State for Mutasi
  const [isMutasiDialogOpen, setIsMutasiDialogOpen] = useState(false);
  const [mutasiFormData, setMutasiFormData] = useState({
    kode_brng: '',
    kd_bangsal_dari: '-',
    kd_bangsal_ke: '-',
    stok: '0',
    no_batch: '',
    no_faktur: '',
    harga: '0',
    keterangan: 'Mutasi'
  });

  // Fetch Warehouses (Bangsal) & Poliklinik
  const { data: warehouseData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => getMasterList('bangsal', 1, 1000)
  });
  const warehouses = warehouseData?.data || [];

  const { data: poliData } = useQuery({
    queryKey: ['poliklinik'],
    queryFn: () => getMasterList('poliklinik', 1, 1000)
  });
  const poliklinik = poliData?.data || [];

  // Combine locations for selection
  const locations = [
    ...(Array.isArray(warehouses) ? warehouses : []).map((w: any) => ({ code: w.kd_bangsal, name: w.nm_bangsal, type: 'Bangsal' })),
    ...(Array.isArray(poliklinik) ? poliklinik : []).map((p: any) => ({ code: p.kd_poli, name: p.nm_poli, type: 'Poli' }))
  ];

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => saveMasterData('databarang', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['allInventory'] });
      toast({ title: "Berhasil", description: "Data obat berhasil disimpan" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });

  const restockMutation = useMutation({
    mutationFn: (data: any) => restockInventory({
      kode_brng: data.kode_brng,
      kd_bangsal: data.kd_bangsal,
      stok: data.stok,
      no_batch: data.no_batch,
      no_faktur: data.no_faktur
    }),
    onSuccess: (data) => {
      if (data.status === 'error') {
        toast({ title: "Gagal", description: data.message, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['allInventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovement'] });
      toast({ title: "Berhasil", description: "Stok berhasil ditambahkan" });
      setIsRestockDialogOpen(false);
      setRestockFormData({
        kode_brng: '',
        kd_bangsal: '-',
        stok: '0',
        no_batch: '',
        no_faktur: '',
        harga: '0',
        keterangan: 'Pengadaan'
      });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });

  const mutasiMutation = useMutation({
    mutationFn: (data: any) => mutasiInventory({
      kode_brng: data.kode_brng,
      kd_bangsaldari: data.kd_bangsal_dari,
      kd_bangsalke: data.kd_bangsal_ke,
      jml: data.stok,
      no_batch: data.no_batch,
      no_faktur: data.no_faktur,
      harga: data.harga,
      keterangan: data.keterangan
    }),
    onSuccess: (data) => {
      if (data.status === 'error') {
        toast({ title: "Gagal", description: data.message, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['allInventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovement'] });
      toast({ title: "Berhasil", description: "Mutasi stok berhasil" });
      setIsMutasiDialogOpen(false);
      setMutasiFormData({
        kode_brng: '',
        kd_bangsal_dari: '-',
        kd_bangsal_ke: '-',
        stok: '0',
        no_batch: '',
        no_faktur: '',
        harga: '0',
        keterangan: 'Mutasi'
      });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (kode_brng: string) => deleteMasterData('databarang', { kode_brng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['allInventory'] });
      toast({ title: "Berhasil", description: "Data obat berhasil dihapus" });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      kode_brng: '',
      nama_brng: '',
      kode_sat: 'pcs',
      h_beli: '0',
      ralan: '0',
      stok: '0',
      stokminimal: '10',
      kdjns: '-',
      expire: format(new Date(), 'yyyy-MM-dd'),
      status: '1'
    });
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: DataBarang) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  const handleRestock = (item: DataBarang) => {
    setSelectedItem(item);
    setRestockFormData(prev => ({ 
      ...prev, 
      kode_brng: item.kode_brng,
      harga: item.h_beli,
      kd_bangsal: warehouses.length > 0 ? warehouses[0].kd_bangsal : '-'
    }));
    setIsRestockDialogOpen(true);
  };

  const handleMutasi = (item: DataBarang) => {
    setSelectedItem(item);
    setMutasiFormData(prev => ({ 
      ...prev, 
      kode_brng: item.kode_brng,
      harga: item.h_beli,
      kd_bangsal_dari: warehouses.length > 0 ? warehouses[0].kd_bangsal : '-',
      kd_bangsal_ke: locations.length > 0 ? locations[0].code : '-'
    }));
    setIsMutasiDialogOpen(true);
  };

  const handleDelete = (item: DataBarang) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    saveMutation.mutate(formData);
  };

  const handleRestockSubmit = () => {
    restockMutation.mutate(restockFormData);
  };

  const handleMutasiSubmit = () => {
    mutasiMutation.mutate(mutasiFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRestockInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRestockFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMutasiInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMutasiFormData(prev => ({ ...prev, [name]: value }));
  };

  // Fetch Inventory Data (DataBarang)
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', page, searchQuery],
    queryFn: () => getInventoryList(page, 10, searchQuery),
  });

  // Fetch Stock Movement Data (RiwayatBarang)
  const { data: stockData, isLoading: isLoadingStock } = useQuery({
    queryKey: ['stockMovement', page, searchQuery, startDate, endDate],
    queryFn: () => getStockMovementList(
      page, 
      10, 
      searchQuery, 
      startDate ? format(startDate, "yyyy-MM-dd") : "", 
      endDate ? format(endDate, "yyyy-MM-dd") : ""
    ),
  });

  // Fetch Gudang Barang (for notifications and total value)
  const { data: gudangData, isLoading: isLoadingGudang } = useQuery({
    queryKey: ['gudangBarang', page], // Might want to fetch all or larger page for notifications
    queryFn: () => getGudangBarangList(1, 100), // Fetch more items for notifications
  });

  // Fetch All Inventory for Notifications (to ensure we have status and expire info for all items)
  const { data: allInventoryData } = useQuery({
    queryKey: ['allInventory'],
    queryFn: () => getInventoryList(1, 1000), 
  });

  // Logic for Notifications
  const getLowStockItems = () => {
    if (!gudangData?.data || !allInventoryData?.data) return [];
    
    // Create a map of DataBarang for easy lookup of stokminimal and nama_brng
    const dataBarangMap = new Map<string, DataBarang>();
    allInventoryData.data.forEach((item: DataBarang) => {
      dataBarangMap.set(item.kode_brng, item);
    });

    return gudangData.data.filter((item: GudangBarang) => {
      // Use logic same as Dashboard: check stok < stokminimal
      // Dashboard uses item.stokminimal if available on gudang item, otherwise default 10
      // If gudang item doesn't have stokminimal, try to get from inventory data map
      
      const dataBarang = dataBarangMap.get(item.kode_brng);
      if (dataBarang && dataBarang.status !== '1') return false; // Filter active only

      const stok = parseFloat(item.stok);
      let stokMin = 10;
      
      if (item.stokminimal && parseFloat(item.stokminimal) > 0) {
          stokMin = parseFloat(item.stokminimal);
      } else {
          if (dataBarang && dataBarang.stokminimal) {
              stokMin = parseFloat(dataBarang.stokminimal);
          }
      }
      
      // Dashboard logic: return stok < stokMin;
      return stok < stokMin;
    }).map((item: GudangBarang) => ({
      ...item,
      nama_brng: dataBarangMap.get(item.kode_brng)?.nama_brng || item.kode_brng,
      min_stok: item.stokminimal && parseFloat(item.stokminimal) > 0 ? item.stokminimal : (dataBarangMap.get(item.kode_brng)?.stokminimal || 10)
    }));
  };

  const getOutOfStockItems = () => {
    if (!gudangData?.data || !allInventoryData?.data) return [];
    
    const dataBarangMap = new Map<string, DataBarang>();
    allInventoryData.data.forEach((item: DataBarang) => {
        dataBarangMap.set(item.kode_brng, item);
    });

    return gudangData.data.filter((item: GudangBarang) => {
        const dataBarang = dataBarangMap.get(item.kode_brng);
        if (dataBarang && dataBarang.status !== '1') return false; // Filter active only
        return parseFloat(item.stok) <= 0;
    })
    .map((item: GudangBarang) => ({
        ...item,
        nama_brng: dataBarangMap.get(item.kode_brng)?.nama_brng || item.kode_brng
    }));
  };

  const getExpiredItems = () => {
    if (!allInventoryData?.data) return [];
    
    return allInventoryData.data.filter((item: DataBarang) => {
      if (item.status !== '1') return false; // Filter active only
      if (!item.expire || item.expire === '0000-00-00') return false;
      const days = differenceInDays(parseISO(item.expire), new Date());
      // Filter items expiring in less than 30 days (including those already expired)
      return days < 30;
    });
  };

  const lowStockList = getLowStockItems();
  const outOfStockList = getOutOfStockItems();
  const expiredList = getExpiredItems();

  // Calculate summaries
  const totalItems = inventoryData?.data?.length || 0;
  const lowStockItems = lowStockList.length;
  const expiredItems = expiredList.length;
  
  // Calculate total value based on gudangData (stok * h_beli)
  const totalValue = gudangData?.data?.reduce((acc: number, item: GudangBarang) => {
    // h_beli might come as string or number, default to 0
    const hBeli = parseFloat(item.h_beli || '0');
    const stok = parseFloat(item.stok || '0');
    return acc + (hBeli * stok);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Obat</h1>
          <p className="text-muted-foreground">Kelola stok obat dan monitoring inventory</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Obat
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Jenis obat terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Perlu restock segera</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kadaluwarsa</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{expiredItems}</div>
            <p className="text-xs text-muted-foreground">Item kadaluarsa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Inventory</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              Rp {totalValue.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">Total nilai stok</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="pergerakan">Pergerakan Stok</TabsTrigger>
          <TabsTrigger value="notifikasi">Notifikasi</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pencarian & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Cari Obat</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Nama obat atau kategori..." 
                      className="pl-8" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      <SelectItem value="antibiotik">Antibiotik</SelectItem>
                      <SelectItem value="analgesik">Analgesik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full md:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Obat</CardTitle>
              <p className="text-sm text-muted-foreground">
                {inventoryData?.data?.length || 0} obat ditampilkan
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kadaluwarsa</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingInventory ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : inventoryData?.data?.map((item: DataBarang) => (
                    <TableRow key={item.kode_brng}>
                      <TableCell className="font-medium">{item.nama_brng}</TableCell>
                      <TableCell>{item.kdjns}</TableCell>
                      <TableCell>{item.stok || '0'}</TableCell>
                      <TableCell>{item.kode_sat}</TableCell>
                      <TableCell>Rp {parseInt(item.ralan).toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === '1' ? 'default' : 'secondary'} className={item.status === '1' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                          {item.status === '1' ? 'Tersedia' : 'Tidak Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.expire}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleRestock(item)}
                            title="Restock"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleMutasi(item)}
                            title="Mutasi"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDelete(item)}
                            title="Hapus"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingInventory && (!inventoryData?.data || inventoryData.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Tidak ada data obat
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pergerakan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Pergerakan Stok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Periode Mulai</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal pl-3",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd MMMM yyyy", { locale: id }) : <span>Pilih Tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Periode Selesai</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal pl-3",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd MMMM yyyy", { locale: id }) : <span>Pilih Tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter Keterangan</label>
                  <Input placeholder="Cari berdasarkan keterangan..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter Obat</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Obat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Obat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pergerakan Stok</CardTitle>
              <p className="text-sm text-muted-foreground">
                {stockData?.data?.length || 0} pergerakan stok ditampilkan
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Obat</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStock ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : stockData?.data?.map((item: RiwayatBarang, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.tanggal}</TableCell>
                      <TableCell>{item.nama_brng || item.kode_brng}</TableCell>
                      <TableCell>
                        <Badge className={
                          Number(item.masuk) > 0 
                            ? "bg-emerald-500 hover:bg-emerald-600" 
                            : "bg-red-500 hover:bg-red-600"
                        }>
                          {Number(item.masuk) > 0 ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(item.masuk) > 0 ? item.masuk : item.keluar}</TableCell>
                      <TableCell>{item.no_faktur !== '0' ? item.no_faktur : '-'}</TableCell>
                      <TableCell>{item.keterangan}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingStock && (!stockData?.data || stockData.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Tidak ada data pergerakan stok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifikasi" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-orange-500 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Stok Menipis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[400px] overflow-auto">
                {lowStockList.length > 0 ? (
                  lowStockList.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{item.nama_brng}</span>
                        <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">
                          Min: {item.min_stok}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{item.nm_bangsal || 'Gudang'}</span>
                        <span>Sisa: {item.stok} {item.kode_sat}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Tidak ada stok menipis</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-500 flex items-center gap-2">
                  <Package className="h-5 w-5" /> Habis Stok
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                {outOfStockList.length > 0 ? (
                    outOfStockList.map((item: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2 mb-2">
                            <div className="flex justify-between items-start">
                                <span className="font-medium">{item.nama_brng}</span>
                                <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">
                                    Stok: 0
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {item.nm_bangsal || 'Gudang'}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Tidak ada obat habis</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-red-500 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Kadaluwarsa
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                {expiredList.length > 0 ? (
                    expiredList.map((item: DataBarang, index: number) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2 mb-2">
                            <div className="flex justify-between items-start">
                                <span className="font-medium">{item.nama_brng}</span>
                                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                                    {item.expire}
                                </Badge>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Tidak ada obat kadaluarsa</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Obat" : "Tambah Obat Baru"}</DialogTitle>
            <DialogDescription>
              {selectedItem ? "Ubah detail data obat di bawah ini." : "Isi detail obat baru di bawah ini."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kode_brng" className="text-right">
                Kode
              </Label>
              <Input
                id="kode_brng"
                name="kode_brng"
                value={formData.kode_brng}
                onChange={handleInputChange}
                className="col-span-3"
                disabled={!!selectedItem} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nama_brng" className="text-right">
                Nama Obat
              </Label>
              <Input
                id="nama_brng"
                name="nama_brng"
                value={formData.nama_brng}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kode_sat" className="text-right">
                Satuan
              </Label>
              <Input
                id="kode_sat"
                name="kode_sat"
                value={formData.kode_sat}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stokminimal" className="text-right">
                Stok Min
              </Label>
              <Input
                id="stokminimal"
                name="stokminimal"
                type="number"
                value={formData.stokminimal}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="h_beli" className="text-right">
                Harga Beli
              </Label>
              <Input
                id="h_beli"
                name="h_beli"
                type="number"
                value={formData.h_beli}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ralan" className="text-right">
                Harga Jual
              </Label>
              <Input
                id="ralan"
                name="ralan"
                type="number"
                value={formData.ralan}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expire" className="text-right">
                Kadaluwarsa
              </Label>
              <Input
                id="expire"
                name="expire"
                type="date"
                value={formData.expire}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as '0' | '1' }))} 
                defaultValue={formData.status}
                value={formData.status}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aktif</SelectItem>
                  <SelectItem value="0">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data obat <strong>{selectedItem?.nama_brng}</strong> akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.kode_brng)}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Restock */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Restock Obat</DialogTitle>
            <DialogDescription>
              Tambah stok untuk obat <strong>{selectedItem?.nama_brng}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kd_bangsal" className="text-right">
                Gudang/Bangsal
              </Label>
              <Select 
                onValueChange={(value) => setRestockFormData(prev => ({ ...prev, kd_bangsal: value }))} 
                defaultValue={restockFormData.kd_bangsal}
                value={restockFormData.kd_bangsal}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Gudang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.kd_bangsal} value={w.kd_bangsal}>
                      {w.nm_bangsal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stok" className="text-right">
                Jumlah Masuk
              </Label>
              <Input
                id="stok"
                name="stok"
                type="number"
                value={restockFormData.stok}
                onChange={handleRestockInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="harga" className="text-right">
                Harga Beli
              </Label>
              <Input
                id="harga"
                name="harga"
                type="number"
                value={restockFormData.harga}
                onChange={handleRestockInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="no_batch" className="text-right">
                No. Batch
              </Label>
              <Input
                id="no_batch"
                name="no_batch"
                value={restockFormData.no_batch}
                onChange={handleRestockInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="no_faktur" className="text-right">
                No. Faktur
              </Label>
              <Input
                id="no_faktur"
                name="no_faktur"
                value={restockFormData.no_faktur}
                onChange={handleRestockInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="keterangan" className="text-right">
                Keterangan
              </Label>
              <Input
                id="keterangan"
                name="keterangan"
                value={restockFormData.keterangan}
                onChange={handleRestockInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleRestockSubmit} disabled={restockMutation.isPending}>
              {restockMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Mutasi */}
      <Dialog open={isMutasiDialogOpen} onOpenChange={setIsMutasiDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mutasi Obat</DialogTitle>
            <DialogDescription>
              Mutasi stok untuk obat <strong>{selectedItem?.nama_brng}</strong> ke Gudang/Bangsal lain.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kd_bangsal_dari" className="text-right">
                Asal Mutasi
              </Label>
              <Select 
                onValueChange={(value) => setMutasiFormData(prev => ({ ...prev, kd_bangsal_dari: value }))} 
                defaultValue={mutasiFormData.kd_bangsal_dari}
                value={mutasiFormData.kd_bangsal_dari}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Asal Mutasi" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {loc.name} ({loc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kd_bangsal_ke" className="text-right">
                Tujuan Mutasi
              </Label>
              <Select 
                onValueChange={(value) => setMutasiFormData(prev => ({ ...prev, kd_bangsal_ke: value }))} 
                defaultValue={mutasiFormData.kd_bangsal_ke}
                value={mutasiFormData.kd_bangsal_ke}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Tujuan Mutasi" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {loc.name} ({loc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stok_mutasi" className="text-right">
                Jumlah
              </Label>
              <Input
                id="stok_mutasi"
                name="stok"
                type="number"
                value={mutasiFormData.stok}
                onChange={handleMutasiInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="no_batch_mutasi" className="text-right">
                No. Batch
              </Label>
              <Input
                id="no_batch_mutasi"
                name="no_batch"
                value={mutasiFormData.no_batch}
                onChange={handleMutasiInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="no_faktur_mutasi" className="text-right">
                No. Faktur
              </Label>
              <Input
                id="no_faktur_mutasi"
                name="no_faktur"
                value={mutasiFormData.no_faktur}
                onChange={handleMutasiInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="keterangan_mutasi" className="text-right">
                Keterangan
              </Label>
              <Input
                id="keterangan_mutasi"
                name="keterangan"
                value={mutasiFormData.keterangan}
                onChange={handleMutasiInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleMutasiSubmit} disabled={mutasiMutation.isPending}>
              {mutasiMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
