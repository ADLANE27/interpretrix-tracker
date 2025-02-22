import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/constants/languages";
import { COUNTRIES } from "@/constants/countries";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfileProps {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    languages: {
      source: string;
      target: string;
    }[];
    employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
    status: "available" | "busy" | "pause" | "unavailable";
    address: {
      street: string;
      postal_code: string;
      city: string;
    } | null;
    birth_country: string | null;
    nationality: string | null;
    phone_interpretation_rate: number | null;
    siret_number: string | null;
    vat_number: string | null;
    profile_picture_url: string | null;
    tarif_5min: number;
    tarif_15min: number;
    specializations: string[];
    landline_phone: string | null;
  };
  onProfileUpdate: () => Promise<void>;
  onProfilePictureUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProfilePictureDelete: () => Promise<void>;
}

export const InterpreterProfile = ({ profile, onProfileUpdate, onProfilePictureUpload, onProfilePictureDelete }: ProfileProps) => {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [street, setStreet] = useState(profile.address?.street || "");
  const [postalCode, setPostalCode] = useState(profile.address?.postal_code || "");
  const [city, setCity] = useState(profile.address?.city || "");
  const [birthCountry, setBirthCountry] = useState(profile.birth_country || "");
  const [nationality, setNationality] = useState(profile.nationality || "");
  const [phoneInterpretationRate, setPhoneInterpretationRate] = useState<number | null>(profile.phone_interpretation_rate);
  const [siretNumber, setSiretNumber] = useState(profile.siret_number || "");
  const [vatNumber, setVatNumber] = useState(profile.vat_number || "");
  const [selectedLanguages, setSelectedLanguages] = useState(profile.languages);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<Date | undefined>(new Date("2023-01-23"));

  useEffect(() => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setPhoneNumber(profile.phone_number || "");
    setStreet(profile.address?.street || "");
    setPostalCode(profile.address?.postal_code || "");
    setCity(profile.address?.city || "");
    setBirthCountry(profile.birth_country || "");
    setNationality(profile.nationality || "");
    setPhoneInterpretationRate(profile.phone_interpretation_rate);
    setSiretNumber(profile.siret_number || "");
    setVatNumber(profile.vat_number || "");
    setSelectedLanguages(profile.languages);
  }, [profile]);

  const handleLanguageAdd = () => {
    setSelectedLanguages([...selectedLanguages, { source: "", target: "" }]);
  };

  const handleLanguageChange = (index: number, field: "source" | "target", value: string) => {
    const newLanguages = [...selectedLanguages];
    newLanguages[index] = {
      ...newLanguages[index],
      [field]: value
    };
    setSelectedLanguages(newLanguages);
  };

  const handleLanguageRemove = (index: number) => {
    const newLanguages = [...selectedLanguages];
    newLanguages.splice(index, 1);
    setSelectedLanguages(newLanguages);
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const languagesStringArray = selectedLanguages.map(lang => `${lang.source} → ${lang.target}`);

      const { error } = await supabase
        .from('interpreter_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          address: {
            street: street,
            postal_code: postalCode,
            city: city
          },
          birth_country: birthCountry,
          nationality: nationality,
          phone_interpretation_rate: phoneInterpretationRate,
          siret_number: siretNumber,
          vat_number: vatNumber,
          languages: languagesStringArray
        })
        .eq('id', user.id);

      if (error) throw error;

      await onProfileUpdate();
      toast({
        title: "Profil mis à jour",
        description: "Votre profil a été mis à jour avec succès",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre profil",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-10rem)] px-4">
      <div className="grid gap-6 py-6">
        <Card className="border-0 shadow-none bg-[#F1F0FB]">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Consulter vos informations personnelles.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Prénom</Label>
                <Input type="text" value={profile.first_name} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Nom</Label>
                <Input type="text" value={profile.last_name} readOnly className="border-0 bg-white shadow-sm" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={profile.email} readOnly className="border-0 bg-white shadow-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Téléphone mobile</Label>
                <Input type="tel" value={profile.phone_number || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Téléphone fixe</Label>
                <Input type="tel" value={profile.landline_phone || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
            </div>

            <Separator className="bg-[#E5DEFF]" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Rue</Label>
                <Input type="text" value={profile.address?.street || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Code postal</Label>
                <Input type="text" value={profile.address?.postal_code || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Ville</Label>
                <Input type="text" value={profile.address?.city || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
            </div>

            <Separator className="bg-[#E5DEFF]" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Pays de naissance</Label>
                <Input type="text" value={profile.birth_country || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Nationalité</Label>
                <Input type="text" value={profile.nationality || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Informations professionnelles</CardTitle>
            <CardDescription>Consulter vos informations professionnelles.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Statut professionnel</Label>
              <Input 
                type="text" 
                value={
                  profile.employment_status === 'salaried_aft' ? 'Salarié AFTrad' :
                  profile.employment_status === 'salaried_aftcom' ? 'Salarié AFTCOM' :
                  profile.employment_status === 'salaried_planet' ? 'Salarié PLANET' :
                  profile.employment_status === 'permanent_interpreter' ? 'Interprète permanent' :
                  'Auto-entrepreneur'
                } 
                readOnly 
                className="border-0 bg-white shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tarif (15 minutes)</Label>
                <Input type="text" value={`${profile.tarif_15min} €`} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Tarif (5 minutes)</Label>
                <Input type="text" value={`${profile.tarif_5min} €`} readOnly className="border-0 bg-white shadow-sm" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tarif d'interprétation téléphonique (€/min)</Label>
              <Input
                type="text"
                value={profile.phone_interpretation_rate ? `${profile.phone_interpretation_rate} €` : ''}
                readOnly
                className="border-0 bg-white shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Numéro SIRET</Label>
                <Input type="text" value={profile.siret_number || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Numéro de TVA</Label>
                <Input type="text" value={profile.vat_number || ''} readOnly className="border-0 bg-white shadow-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Langues</CardTitle>
            <CardDescription>Vos paires de langues.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.languages.map((lang, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="secondary">{lang.source}</Badge>
                  <span>→</span>
                  <Badge variant="secondary">{lang.target}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>Gérer votre photo de profil.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Avatar>
                {profile.profile_picture_url ? (
                  <AvatarImage src={profile.profile_picture_url} alt="Photo de profil" />
                ) : (
                  <AvatarFallback>{profile.first_name[0]}{profile.last_name[0]}</AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-2">
                <Button variant="secondary" onClick={() => document.getElementById('profile-picture-input')?.click()}>
                  Télécharger une nouvelle photo
                </Button>
                <Input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onProfilePictureUpload}
                />
                {profile.profile_picture_url && (
                  <Button variant="destructive" onClick={onProfilePictureDelete}>
                    Supprimer la photo
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
