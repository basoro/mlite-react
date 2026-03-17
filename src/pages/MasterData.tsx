import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMasterList, saveMasterData, deleteMasterData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, ChevronLeft, ChevronRight, Loader2, Database, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_TABLES = [
  'dokter', 'petugas', 'poliklinik', 'bangsal', 'kamar', 'databarang',
  'jns_perawatan', 'jns_perawatan_inap', 'jns_perawatan_lab', 'jns_perawatan_radiologi',
  'bahasa', 'propinsi', 'kabupaten', 'kecamatan', 'kelurahan', 'cacat_fisik', 'suku_bangsa',
  'perusahaan_pasien', 'penjab', 'golongan_barang', 'industri_farmasi', 'jenis', 'kategori_barang',
  'kategori_penyakit', 'penyakit', 'icd9', 'kategori_perawatan', 'kode_satuan',
  'master_aturan_pakai', 'master_berkas_digital', 'spesialis', 'bank', 'bidang', 'departemen',
  'emergency_index', 'jabatan', 'jenjang_jabatan', 'kelompok_jabatan', 'pendidikan',
  'resiko_kerja', 'status_kerja', 'status_wp', 'metode_racik', 'ruang_ok', 'gudangbarang', 'riwayat_barang_medis', 
  'diagnosa_pasien', 'prosedur_pasien', 'mlite_modules', 'mlite_settings', 'detail_pemberian_obat', 'mutasibarang'
];

export default function MasterData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<string>("dokter");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { data: masterData, isLoading, isError, error } = useQuery({
    queryKey: ['masterData', selectedTable, page, perPage, searchQuery],
    queryFn: () => getMasterList(selectedTable, page, perPage, searchQuery),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => saveMasterData(selectedTable, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData', selectedTable] });
      toast({ title: "Berhasil", description: "Data berhasil disimpan" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (data: any) => deleteMasterData(selectedTable, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData', selectedTable] });
      toast({ title: "Berhasil", description: "Data berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  });

  const handleTableChange = (value: string) => {
    setSelectedTable(value);
    setPage(1);
    setSearchQuery("");
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const formatHeader = (key: string) => {
    return key.replace(/_/g, ' ').toUpperCase();
  };

  // Extract columns from the first item if available
  const columns = masterData?.data && masterData.data.length > 0 
    ? Object.keys(masterData.data[0]) 
    : [];

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      deleteMutation.mutate(item);
    }
  };

  const handleFormSubmit = () => {
    saveMutation.mutate(formData);
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Data</h1>
          <p className="text-muted-foreground">Kelola semua data master sistem</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Pilih Tabel Data</label>
              <Select value={selectedTable} onValueChange={handleTableChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tabel" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_TABLES.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Cari Data</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Cari di ${selectedTable.replace(/_/g, ' ')}...`}
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="capitalize">{selectedTable.replace(/_/g, ' ')}</CardTitle>
          <div className="text-sm text-muted-foreground">
             Total: {masterData?.meta?.total || 0} Data
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap">
                      {formatHeader(col)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center text-red-500">
                      Terjadi kesalahan: {(error as Error).message}
                    </TableCell>
                  </TableRow>
                ) : masterData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-8 w-8 text-muted-foreground/50" />
                        <p>Tidak ada data ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  masterData?.data?.map((row: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{(page - 1) * perPage + index + 1}</TableCell>
                      {columns.map((col) => (
                        <TableCell key={`${index}-${col}`} className="whitespace-nowrap">
                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(row)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Halaman {page} dari {Math.ceil((masterData?.meta?.total || 0) / perPage)}
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((old) => Math.max(old - 1, 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((old) => old + 1)}
                disabled={!masterData?.data || masterData.data.length < perPage || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Data' : 'Tambah Data Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {columns.length > 0 ? columns.map((col) => (
              <div key={col} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={col} className="text-right">
                  {formatHeader(col)}
                </Label>
                <Input
                  id={col}
                  value={formData[col] || ''}
                  onChange={(e) => handleInputChange(col, e.target.value)}
                  className="col-span-3"
                />
              </div>
            )) : (
               <div className="text-center text-muted-foreground py-8">
                  Kolom belum tersedia. Silakan pilih tabel lain atau pastikan tabel memiliki data untuk mendeteksi kolom.
                  <br />
                  <span className="text-xs text-orange-500">
                    (Tips: Untuk tabel kosong, Anda perlu mengetahui nama kolom secara manual - fitur ini bergantung pada data yang ada untuk skema)
                  </span>
               </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleFormSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
