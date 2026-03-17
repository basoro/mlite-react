import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Calendar as CalendarIcon, 
  User, 
  CreditCard,
  Eye,
  CheckCircle2,
  Printer,
  Stethoscope,
  BedDouble,
  Trash2,
  PlusCircle,
  Pill,
  Activity,
  Microscope,
  Radiation,
  FlaskConical,
  X
} from 'lucide-react';
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getKasirRalanList, 
  getKasirRanapList, 
  getBillingDetail, 
  getRiwayatPerawatan, 
  simpanKasir, 
  hapusItemKasir,
  simpanItemKasir,
  searchLayanan,
  searchObat,
  searchLaboratorium,
  searchRadiologi,
  searchMetodeRacik
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const Kasir = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"ralan" | "ranap">("ralan");
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(),
  });
  const [search, setSearch] = useState("");
  const [selectedPasien, setSelectedPasien] = useState<any>(null);
  
  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentChange, setPaymentChange] = useState<number>(0);

  // Add Item State
  const [addItemType, setAddItemType] = useState<"tindakan" | "obat" | "racikan" | "laboratorium" | "radiologi">("tindakan");
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemAturan, setItemAturan] = useState("");

  // Racikan State
  const [racikanName, setRacikanName] = useState("");
  const [racikanMethod, setRacikanMethod] = useState<any>(null);
  const [racikanQty, setRacikanQty] = useState(1);
  const [racikanIngredients, setRacikanIngredients] = useState<any[]>([]);
  const [racikanNote, setRacikanNote] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientSearchResults, setIngredientSearchResults] = useState<any[]>([]);
  const [isSearchingIngredient, setIsSearchingIngredient] = useState(false);

  // Fetch List
  const { data: listData, isLoading: isLoadingList } = useQuery({
    queryKey: ['kasir-list', activeTab, date.from, date.to, search],
    queryFn: () => activeTab === 'ralan'
      ? getKasirRalanList(1, 100, search, format(date.from, 'yyyy-MM-dd'), format(date.to, 'yyyy-MM-dd'))
      : getKasirRanapList(1, 100, search, format(date.from, 'yyyy-MM-dd'), format(date.to, 'yyyy-MM-dd')),
  });

  // Fetch Detail
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['kasir-detail', selectedPasien?.no_rawat, activeTab],
    queryFn: () => getBillingDetail(selectedPasien?.no_rawat, activeTab),
    enabled: !!selectedPasien?.no_rawat,
  });

  // Fetch Riwayat Perawatan for Header Data (Settings)
  const { data: riwayatPerawatanData } = useQuery({
    queryKey: ['riwayatPerawatan', selectedPasien?.no_rkm_medis, selectedPasien?.no_rawat],
    queryFn: () => getRiwayatPerawatan(selectedPasien.no_rkm_medis, selectedPasien.no_rawat),
    enabled: !!selectedPasien?.no_rkm_medis && !!selectedPasien?.no_rawat,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (item: any) => hapusItemKasir({
      ...item,
      no_rawat: selectedPasien?.no_rawat
    }, activeTab),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kasir-detail'] });
      toast.success(data.message || "Item berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus item: " + error.message);
    }
  });

  const savePaymentMutation = useMutation({
    mutationFn: (data: any) => simpanKasir(data, activeTab),
    onSuccess: (data) => {
      setIsPayModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['kasir-list'] });
      queryClient.invalidateQueries({ queryKey: ['kasir-detail'] });
      toast.success(data.message);
      handlePrint(); // Auto print after save?
    },
    onError: (error) => {
      toast.error("Gagal menyimpan pembayaran: " + error.message);
    }
  });

  const addItemMutation = useMutation({
    mutationFn: (data: any) => simpanItemKasir(data, activeTab),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kasir-detail'] });
      toast.success(data.message || "Item berhasil ditambahkan");
      setSelectedItem(null);
      setItemSearch("");
      setItemSearchResults([]);
      setItemQty(1);
      setItemAturan("");
    },
    onError: (error) => {
      toast.error("Gagal menambah item: " + error.message);
    }
  });

  // Item Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (addItemType === 'racikan') {
          if (itemSearch.length < 1) {
              setItemSearchResults([]);
              return;
          }
      } else {
          if (itemSearch.length < 3) {
              setItemSearchResults([]);
              return;
          }
      }

      setIsSearchingItem(true);
      try {
        let res;
        if (addItemType === 'tindakan') {
          res = await searchLayanan(itemSearch);
        } else if (addItemType === 'obat') {
          res = await searchObat(itemSearch, activeTab);
        } else if (addItemType === 'laboratorium') {
          res = await searchLaboratorium(itemSearch);
        } else if (addItemType === 'radiologi') {
          res = await searchRadiologi(itemSearch);
        } else if (addItemType === 'racikan') {
          res = await searchMetodeRacik(itemSearch);
        }
        
        // Normalize response
        if (addItemType === 'racikan') {
            setItemSearchResults(res.data || res.metode_racik || []);
        } else {
            setItemSearchResults(res.data || res.layanan || res.obat || []);
        }
      } catch (e) {
        console.error(e);
        setItemSearchResults([]);
      } finally {
        setIsSearchingItem(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [itemSearch, addItemType, activeTab]);

  // Ingredient Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (ingredientSearch.length < 3) {
        setIngredientSearchResults([]);
        return;
      }

      setIsSearchingIngredient(true);
      try {
        const res = await searchObat(ingredientSearch, activeTab);
        setIngredientSearchResults(res.data || res.obat || []);
      } catch (e) {
        console.error(e);
        setIngredientSearchResults([]);
      } finally {
        setIsSearchingIngredient(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [ingredientSearch, activeTab]);

  const handleAddItem = () => {
    if (!selectedPasien) return;
    if (addItemType !== 'racikan' && !selectedItem) return;
    if (addItemType === 'racikan' && (!racikanName || !racikanMethod || racikanIngredients.length === 0)) {
        toast.error("Mohon lengkapi data racikan");
        return;
    }

    const payload: any = {
      kat: addItemType,
      no_rawat: selectedPasien.no_rawat,
      tgl_perawatan: format(new Date(), 'yyyy-MM-dd'),
      jam_rawat: format(new Date(), 'HH:mm:ss'),
    };

    if (addItemType === 'tindakan') {
      payload.kd_jenis_prw = selectedItem.kd_jenis_prw;
      payload.provider = 'rawat_jl_dr'; 
      payload.jml_tindakan = 1; 
      payload.kode_provider = selectedPasien.kd_dokter; 
      payload.kode_provider2 = '-'; 
    } else if (addItemType === 'obat') {
      payload.kd_jenis_prw = selectedItem.kode_brng; 
      payload.jml = itemQty;
      payload.biaya = selectedItem.ralan; 
      payload.aturan_pakai = itemAturan;
    } else if (addItemType === 'laboratorium' || addItemType === 'radiologi') {
      payload.kd_jenis_prw = selectedItem.kd_jenis_prw;
      payload.kode_provider = selectedPasien.kd_dokter; // Pengirim
      payload.kode_provider2 = '-'; // Petugas (optional, handled by backend default)
    } else if (addItemType === 'racikan') {
      payload.nama_racik = racikanName;
      payload.kd_jenis_prw = racikanMethod.kd_racik;
      payload.jml = racikanQty;
      payload.aturan_pakai = itemAturan; // Use common state
      payload.keterangan = racikanNote;
      payload.items = racikanIngredients.map(i => ({
        kode_brng: i.kode_brng,
        kandungan: i.kandungan
      }));
    }

    addItemMutation.mutate(payload);
  };

  const patients = listData?.data || [];
  const billingDetails = detailData?.data?.details || [];
  const billingTotal = detailData?.data?.total || 0;
  
  // Calculate total based on current details (in case of optimistic updates or just to be sure)
  // Actually detailData.total comes from backend, but if we delete items, we want the list to refresh.
  // The mutation invalidates query, so billingTotal should update.

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const settings = riwayatPerawatanData?.data?.settings || detailData?.data?.settings || {};
  const patientDetail = detailData?.data?.pasien || selectedPasien || {};

  useEffect(() => {
    if (isPayModalOpen) {
      // Reset payment input when opening modal
      setPaymentAmount("");
      setPaymentChange(0);
    }
  }, [isPayModalOpen]);

  const handlePaymentChange = (val: string) => {
    const numVal = parseInt(val.replace(/\D/g, '') || '0');
    setPaymentAmount(val);
    setPaymentChange(numVal - billingTotal);
  };

  const handleSimpanBayar = () => {
    if (!selectedPasien) return;
    
    // Prepare payload for simpanKasir
    // Based on Admin.php postSave logic
    const payload = {
      no_rawat: selectedPasien.no_rawat,
      tgl_bayar: format(new Date(), 'yyyy-MM-dd'),
      jam_bayar: format(new Date(), 'HH:mm:ss'),
      jumlah_harus_bayar: billingTotal,
      potongan: 0, // Implement discount if needed
      bayar: parseInt(paymentAmount.replace(/\D/g, '') || '0'),
      kembali: paymentChange,
      // Calculate per-category totals for journaling
      jurnal_pendaftaran: billingDetails.filter((i: any) => i.kategori === 'Registrasi').reduce((acc: number, cur: any) => acc + cur.subtotal, 0),
      jurnal_tindakan_ralan: billingDetails.filter((i: any) => i.kategori.includes('Tindakan')).reduce((acc: number, cur: any) => acc + cur.subtotal, 0),
      jurnal_obat_bhp: billingDetails.filter((i: any) => i.kategori === 'Obat & BHP').reduce((acc: number, cur: any) => acc + cur.subtotal, 0),
      jurnal_laboratorium: billingDetails.filter((i: any) => i.kategori === 'Laboratorium').reduce((acc: number, cur: any) => acc + cur.subtotal, 0),
      jurnal_radiologi: billingDetails.filter((i: any) => i.kategori === 'Radiologi').reduce((acc: number, cur: any) => acc + cur.subtotal, 0),
    };

    savePaymentMutation.mutate(payload);
  };

  const handleDeleteItem = (item: any) => {
    if (confirm('Apakah anda yakin ingin menghapus item ini?')) {
      deleteItemMutation.mutate(item);
    }
  };

  const handlePrint = () => {
    if (!selectedPasien) return;
    
    const groupedDetails = billingDetails.reduce((groups: any, item: any) => {
      const category = item.kategori || 'Lainnya';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});

    const logoUrl = settings.logo ? `${import.meta.env.VITE_API_BASE_URL || ''}/${settings.logo}` : '';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bukti Pembayaran - ${selectedPasien.nm_pasien}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #000; margin: 0; padding: 0; }
            .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .logo { width: 70px; height: 70px; object-fit: contain; }
            .instansi-info { flex: 1; text-align: center; }
            .instansi-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .instansi-address { font-size: 9pt; margin: 2px 0; }
            .nota-title { text-align: center; font-weight: bold; font-size: 12pt; margin: 10px 0; text-transform: uppercase; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 5px 0; }
            
            .info-table { width: 100%; font-size: 9pt; margin-bottom: 10px; border-collapse: collapse; }
            .info-table td { vertical-align: top; padding: 2px; }
            .label { width: 15%; font-weight: bold; }
            .separator { width: 2%; }
            .value { width: 33%; }
            
            .billing-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; }
            .billing-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px; text-align: left; font-weight: bold; }
            .billing-table td { padding: 4px 5px; border-bottom: 1px solid #eee; }
            .group-header { font-weight: bold; background-color: #f9f9f9; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 9pt; }
            .signature { text-align: center; width: 200px; }
            .signature-space { height: 60px; }
            
            @media print {
               a[href]:after { content: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
            <div class="instansi-info">
              <div class="instansi-name">${settings.nama_instansi || 'RUMAH SAKIT MLITE INDONESIA'}</div>
              <div class="instansi-address">${settings.alamat || 'Jl. Perintis Kemerdekaan No. 45'}, ${settings.kota || 'Hulu Sungai Tengah'}</div>
              <div class="instansi-address">Telp: ${settings.nomor_telepon || '081250067788'} | Email: ${settings.email || 'info@mlite.id'}</div>
              <div class="instansi-address">${settings.website || 'http://mlite.id'}</div>
            </div>
            <div style="width: 70px;"></div> 
          </div>

          <div class="nota-title">BUKTI PEMBAYARAN</div>

          <table class="info-table">
            <tr>
              <td class="label">NAMA PASIEN</td>
              <td class="separator">:</td>
              <td class="value">${selectedPasien.nm_pasien}</td>
              <td class="label">TGL. LAHIR</td>
              <td class="separator">:</td>
              <td class="value">${patientDetail.tgl_lahir || '-'} (${patientDetail.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'})</td>
            </tr>
            <tr>
              <td class="label">ALAMAT</td>
              <td class="separator">:</td>
              <td class="value">${selectedPasien.alamat || '-'}</td>
              <td class="label">NO. RM</td>
              <td class="separator">:</td>
              <td class="value">${selectedPasien.no_rkm_medis}</td>
            </tr>
            <tr>
              <td class="label">NO. RAWAT</td>
              <td class="separator">:</td>
              <td class="value">${selectedPasien.no_rawat}</td>
              <td class="label">CARA BAYAR</td>
              <td class="separator">:</td>
              <td class="value">${selectedPasien.png_jawab || '-'}</td>
            </tr>
             <tr>
              <td class="label">DOKTER</td>
              <td class="separator">:</td>
              <td class="value" colspan="4">${selectedPasien.nm_dokter || '-'}</td>
            </tr>
          </table>

          <table class="billing-table">
            <thead>
              <tr>
                <th style="width: 30%">Keterangan</th>
                <th style="width: 30%">Tagihan/Tindakan/Terapi</th>
                <th class="text-right" style="width: 15%">Biaya</th>
                <th class="text-center" style="width: 10%">Jml</th>
                <th class="text-right" style="width: 15%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(groupedDetails).map(([category, items]: [string, any]) => `
                <tr class="group-header">
                  <td colspan="5" style="border-bottom: 1px solid #ccc; padding-top: 10px;">${category}</td>
                </tr>
                ${items.map((item: any) => `
                  <tr>
                    <td></td>
                    <td>${item.nama}</td>
                    <td class="text-right">${formatCurrency(item.biaya || (item.subtotal / item.jumlah))}</td>
                    <td class="text-center">${item.jumlah}</td>
                    <td class="text-right">${formatCurrency(item.subtotal)}</td>
                  </tr>
                `).join('')}
                <tr>
                   <td colspan="4" class="text-right" style="font-weight: bold; font-style: italic; padding-right: 10px;">Subtotal ${category} :</td>
                   <td class="text-right" style="font-weight: bold;">${formatCurrency(items.reduce((acc: number, curr: any) => acc + curr.subtotal, 0))}</td>
                </tr>
              `).join('')}
              
              <tr style="border-top: 2px solid #000;">
                <td colspan="4" class="text-right" style="font-weight: bold; font-size: 11pt; padding: 10px;">TOTAL BIAYA</td>
                <td class="text-right" style="font-weight: bold; font-size: 11pt; padding: 10px;">${formatCurrency(billingTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div>
               <p>Tgl. Cetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <div class="signature">
              <p>${settings.kota || 'Kota'}, ${format(new Date(), 'dd MMMM yyyy')}</p>
              <p>Kasir</p>
              <div class="signature-space"></div>
              <p>(${localStorage.getItem('auth_username') || 'Admin'})</p>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const groupedDetails = billingDetails.reduce((groups: any, item: any) => {
    const category = item.kategori || 'Lainnya';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Kasir & Pembayaran</h1>
        <p className="text-muted-foreground">
          Kelola pembayaran pasien Rawat Jalan dan Rawat Inap
        </p>
      </div>

      <Tabs defaultValue="ralan" className="w-full" onValueChange={(v) => { setActiveTab(v as any); setSelectedPasien(null); }}>
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="ralan">Rawat Jalan</TabsTrigger>
          <TabsTrigger value="ranap">Rawat Inap</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pasien..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !date.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date.from}
                  selected={date as any}
                  onSelect={(range: any) => setDate(range || { from: new Date(), to: new Date() })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* List Pasien */}
          <div className="md:col-span-2">
            <Card className="h-[calc(100vh-250px)] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Daftar Tagihan</CardTitle>
                <CardDescription>
                  {isLoadingList ? "Memuat data..." : `Menampilkan ${patients.length} pasien`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>No. Rawat / RM</TableHead>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Dokter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingList ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : patients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Tidak ada data ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      patients.map((pasien: any) => (
                        <TableRow 
                          key={pasien.no_rawat}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedPasien?.no_rawat === pasien.no_rawat && "bg-blue-50/50"
                          )}
                          onClick={() => setSelectedPasien(pasien)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{pasien.no_rawat}</span>
                              <span className="text-xs text-muted-foreground">{pasien.no_rkm_medis}</span>
                            </div>
                          </TableCell>
                          <TableCell>{pasien.nm_pasien}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[120px]">{pasien.nm_dokter}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pasien.status_bayar === 'Sudah Bayar' ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600">Lunas</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">Belum Bayar</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPasien(pasien);
                              }}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Detail Tagihan */}
          <div className="md:col-span-1">
            <Card className="h-[calc(100vh-250px)] flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rincian Tagihan
                </CardTitle>
                {selectedPasien ? (
                  <div className="space-y-1 mt-2">
                    <p className="font-medium text-sm">{selectedPasien.nm_pasien}</p>
                    <p className="text-xs text-muted-foreground">{selectedPasien.no_rawat}</p>
                  </div>
                ) : (
                  <CardDescription>Pilih pasien untuk melihat rincian</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto pt-4">
                {selectedPasien ? (
                  isLoadingDetail ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      Memuat rincian...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {billingDetails.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-sm border-b border-dashed pb-2 last:border-0">
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-slate-700">{item.nama}</p>
                            <p className="text-xs text-muted-foreground">{item.kategori} {item.jumlah > 1 && `x ${item.jumlah}`}</p>
                          </div>
                          <div className="font-medium whitespace-nowrap">
                            {formatCurrency(item.subtotal)}
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-4 mt-4 border-t flex justify-between items-center bg-slate-50 p-3 rounded-md">
                        <span className="font-bold">Total Tagihan</span>
                        <span className="font-bold text-lg text-emerald-600">
                          {formatCurrency(billingTotal)}
                        </span>
                      </div>

                      <div className="pt-4 grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={handlePrint}
                          disabled={detailData?.data?.registrasi?.status_bayar !== 'Sudah Bayar'}
                        >
                          <Printer className="mr-2 h-4 w-4" /> Cetak
                        </Button>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => setIsPayModalOpen(true)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" /> Bayar
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                    <CreditCard className="h-12 w-12 mb-2" />
                    <p className="text-sm">Pilih pasien dari daftar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pembayaran Tagihan</DialogTitle>
            <DialogDescription>
              {selectedPasien?.nm_pasien} - {selectedPasien?.no_rawat}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Nama Item</TableHead>
                    <TableHead className="text-right">Biaya</TableHead>
                    <TableHead className="text-center">Jml</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedDetails).map(([category, items]: [string, any]) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={6} className="font-semibold py-2">
                          {category}
                        </TableCell>
                      </TableRow>
                      {items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell></TableCell>
                          <TableCell className="py-2">{item.nama}</TableCell>
                          <TableCell className="text-right py-2">{formatCurrency(item.biaya || (item.subtotal / item.jumlah))}</TableCell>
                          <TableCell className="text-center py-2">{item.jumlah}</TableCell>
                          <TableCell className="text-right py-2">{formatCurrency(item.subtotal)}</TableCell>
                          <TableCell className="py-2">
                            {item.type && ( // Only show delete for deletable items (those with type)
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive/90"
                                onClick={() => handleDeleteItem(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Left side: Add Item Form */}
               <div className="space-y-4">
                 <div className="p-4 border rounded-md bg-white shadow-sm h-full flex flex-col">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" /> Tambah Item
                    </h3>
                    
                    <Tabs value={addItemType} onValueChange={(v) => {
                      setAddItemType(v as any);
                      setSelectedItem(null);
                      setItemSearch("");
                      setItemSearchResults([]);
                    }} className="w-full">
                      <ScrollArea className="w-full whitespace-nowrap mb-4 border rounded-md">
                        <TabsList className="flex w-max p-1 h-auto bg-transparent">
                            <TabsTrigger value="tindakan" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-muted">
                            <Activity className="h-4 w-4" /> Tindakan
                            </TabsTrigger>
                            <TabsTrigger value="obat" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-muted">
                            <Pill className="h-4 w-4" /> Obat
                            </TabsTrigger>
                            <TabsTrigger value="racikan" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-muted">
                            <FlaskConical className="h-4 w-4" /> Racikan
                            </TabsTrigger>
                            <TabsTrigger value="laboratorium" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-muted">
                            <Microscope className="h-4 w-4" /> Lab
                            </TabsTrigger>
                            <TabsTrigger value="radiologi" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-muted">
                            <Radiation className="h-4 w-4" /> Rad
                            </TabsTrigger>
                        </TabsList>
                      </ScrollArea>
                      
                      <div className="space-y-4">
                        {addItemType === 'racikan' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nama Racikan</Label>
                                        <Input 
                                            value={racikanName}
                                            onChange={(e) => setRacikanName(e.target.value)}
                                            placeholder="Nama Racikan..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Metode</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between h-8 text-sm font-normal">
                                                    {racikanMethod ? racikanMethod.nm_racik : "Pilih Metode..."}
                                                    <Search className="ml-2 h-3 w-3 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0" align="start">
                                                <div className="p-2">
                                                    <Input 
                                                        placeholder="Cari metode..." 
                                                        value={itemSearch}
                                                        onChange={(e) => setItemSearch(e.target.value)}
                                                        className="h-8 text-sm mb-2"
                                                    />
                                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                                        {itemSearchResults.map((m: any) => (
                                                            <div 
                                                                key={m.kd_racik}
                                                                className="text-sm p-2 hover:bg-slate-100 rounded cursor-pointer"
                                                                onClick={() => {
                                                                    setRacikanMethod(m);
                                                                    setItemSearch("");
                                                                    setItemSearchResults([]);
                                                                }}
                                                            >
                                                                {m.nm_racik}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Jumlah</Label>
                                        <Input 
                                            type="number"
                                            value={racikanQty}
                                            onChange={(e) => setRacikanQty(parseInt(e.target.value) || 1)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs">Aturan Pakai</Label>
                                        <Input 
                                            value={itemAturan}
                                            onChange={(e) => setItemAturan(e.target.value)}
                                            placeholder="3x1..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Keterangan</Label>
                                    <Input 
                                        value={racikanNote}
                                        onChange={(e) => setRacikanNote(e.target.value)}
                                        placeholder="Keterangan..."
                                        className="h-8 text-sm"
                                    />
                                </div>
                                
                                <Separator />
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Komposisi Obat</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Cari obat untuk ditambahkan..."
                                            className="pl-8 h-9 text-sm"
                                            value={ingredientSearch}
                                            onChange={(e) => setIngredientSearch(e.target.value)}
                                        />
                                    </div>
                                    {/* Ingredient Search Results */}
                                    {ingredientSearchResults.length > 0 && (
                                        <div className="border rounded-md max-h-[150px] overflow-y-auto p-1 bg-white relative z-10 w-full shadow-md">
                                            {ingredientSearchResults.map((obat: any) => (
                                                <div 
                                                    key={obat.kode_brng}
                                                    className="p-2 hover:bg-slate-100 text-sm cursor-pointer flex justify-between"
                                                    onClick={() => {
                                                        if (!racikanIngredients.find(i => i.kode_brng === obat.kode_brng)) {
                                                            setRacikanIngredients([...racikanIngredients, { ...obat, kandungan: 1 }]);
                                                        }
                                                        setIngredientSearch("");
                                                        setIngredientSearchResults([]);
                                                    }}
                                                >
                                                    <span>{obat.nama_brng}</span>
                                                    <span className="text-xs text-muted-foreground">Stok: {obat.stok}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Added Ingredients List */}
                                    <div className="space-y-2 mt-2">
                                        {racikanIngredients.map((ing, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm border p-2 rounded bg-slate-50">
                                                <span className="flex-1 truncate">{ing.nama_brng}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">Kandungan:</span>
                                                    <Input 
                                                        type="number"
                                                        className="h-6 w-16 text-right px-1"
                                                        value={ing.kandungan}
                                                        onChange={(e) => {
                                                            const newIngs = [...racikanIngredients];
                                                            newIngs[idx].kandungan = parseFloat(e.target.value) || 0;
                                                            setRacikanIngredients(newIngs);
                                                        }}
                                                    />
                                                    <span className="text-xs text-muted-foreground">{ing.kode_sat || 'pcs'}</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-red-500"
                                                    onClick={() => {
                                                        setRacikanIngredients(racikanIngredients.filter((_, i) => i !== idx));
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        {racikanIngredients.length === 0 && (
                                            <p className="text-xs text-center text-muted-foreground py-2 italic">Belum ada obat dipilih</p>
                                        )}
                                    </div>
                                </div>

                                <Button 
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-sm mt-2"
                                    onClick={handleAddItem}
                                    disabled={addItemMutation.isPending}
                                >
                                    Simpan Racikan
                                </Button>
                            </div>
                        ) : (
                            // Existing UI for Tindakan/Obat/Lab/Rad
                            <>
                                <div className="space-y-2">
                                <Label>Cari {addItemType.charAt(0).toUpperCase() + addItemType.slice(1)}</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                    placeholder={`Ketikan nama ${addItemType}... (min 3 huruf)`}
                                    className="pl-8"
                                    value={itemSearch}
                                    onChange={(e) => {
                                        setItemSearch(e.target.value);
                                        if (!e.target.value) setSelectedItem(null);
                                    }}
                                    />
                                </div>
                                </div>

                                {/* Search Results */}
                                {isSearchingItem && <div className="text-sm text-muted-foreground">Mencari...</div>}
                                
                                {!selectedItem && itemSearchResults.length > 0 && (
                                <ScrollArea className="h-[200px] border rounded-md p-2">
                                    <div className="space-y-1">
                                    {itemSearchResults.map((item: any, idx) => (
                                        <div 
                                        key={idx}
                                        className="p-2 hover:bg-slate-100 rounded cursor-pointer text-sm flex justify-between items-center"
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setItemSearchResults([]);
                                            setItemSearch(item.nm_perawatan || item.nama_brng);
                                        }}
                                        >
                                            <div className="flex flex-col">
                                            <span className="font-medium">{item.nm_perawatan || item.nama_brng}</span>
                                            {item.nama_brng && (
                                                <span className="text-xs text-muted-foreground">
                                                Stok: {item.stok} | Harga: {formatCurrency(item.ralan)}
                                                </span>
                                            )}
                                            {item.nm_perawatan && (
                                                <span className="text-xs text-muted-foreground">
                                                Kategori: {item.nm_kategori} | Tarif: {formatCurrency(item.total_byrdr)}
                                                </span>
                                            )}
                                            </div>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                            <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    </div>
                                </ScrollArea>
                                )}

                                {/* Selected Item Details & Add Form */}
                                {selectedItem && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md space-y-3">
                                    <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-sm text-blue-900">{selectedItem.nm_perawatan || selectedItem.nama_brng}</p>
                                        <p className="text-xs text-blue-700">
                                        {addItemType === 'tindakan' || addItemType === 'laboratorium' || addItemType === 'radiologi'
                                            ? `Tarif: ${formatCurrency(selectedItem.total_byrdr)}` 
                                            : `Harga: ${formatCurrency(selectedItem.ralan)} | Stok: ${selectedItem.stok}`
                                        }
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-700" onClick={() => {
                                        setSelectedItem(null);
                                        setItemSearch("");
                                    }}>x</Button>
                                    </div>
                                    
                                    {addItemType === 'obat' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Jumlah</Label>
                                            <Input 
                                            type="number" 
                                            min={1} 
                                            value={itemQty} 
                                            onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                                            className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Aturan Pakai</Label>
                                            <Input 
                                            value={itemAturan} 
                                            onChange={(e) => setItemAturan(e.target.value)}
                                            placeholder="Contoh: 3x1"
                                            className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                    )}

                                    <Button 
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-sm"
                                    onClick={handleAddItem}
                                    disabled={addItemMutation.isPending}
                                    >
                                    {addItemMutation.isPending ? "Menambahkan..." : "Tambahkan Item"}
                                    </Button>
                                </div>
                                )}
                            </>
                        )}
                      </div>
                    </Tabs>
                 </div>
               </div>

               {/* Right side: Payment calculation */}
               <div className="space-y-4 p-4 border rounded-md shadow-sm">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Tagihan</span>
                    <span>{formatCurrency(billingTotal)}</span>
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <Label htmlFor="bayar">Bayar (Rp)</Label>
                    <Input
                      id="bayar"
                      value={paymentAmount}
                      onChange={(e) => handlePaymentChange(e.target.value)}
                      placeholder="0"
                      className="text-right text-lg font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center font-medium text-slate-600">
                    <span>Kembalian</span>
                    <span className={cn(paymentChange < 0 ? "text-red-500" : "text-emerald-600")}>
                      {formatCurrency(paymentChange)}
                    </span>
                  </div>
               </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>Batal</Button>
            <Button 
              onClick={handleSimpanBayar} 
              disabled={savePaymentMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savePaymentMutation.isPending ? "Menyimpan..." : "Simpan & Cetak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kasir;
