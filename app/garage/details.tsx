import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import { KeyboardScreen, keyboardScrollProps } from "@/components/KeyboardScreen";
import {
  fetchGarageDetails,
  updateGarageDetails,
  type GarageDetails,
} from "@/lib/garage-profile-db";
import { backOrReplace } from "@/lib/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";

const garageDetailsSchema = z.object({
  garageName: z.string().trim().optional(),
  garageImageUrl: z.string().trim().optional(),
  contactEmail: z
    .string()
    .trim()
    .email("Use a valid contact email.")
    .or(z.literal(""))
    .optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  city: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

type GarageDetailsForm = z.infer<typeof garageDetailsSchema>;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  multiline?: boolean;
  onFocus?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        onFocus={onFocus}
      />
    </View>
  );
}

export default function GarageDetailsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GarageDetailsForm>({
    resolver: zodResolver(garageDetailsSchema),
    defaultValues: {
      garageName: "",
      garageImageUrl: "",
      contactEmail: "",
      phone: "",
      website: "",
      city: "",
      bio: "",
    },
  });
  const { data: savedDetails } = useQuery({
    queryKey: ["garage-details"],
    queryFn: fetchGarageDetails,
  });
  const [garageImage, setGarageImage] = useState<{
    uri: string;
    base64?: string;
    mimeType?: string;
  } | null>(null);

  useEffect(() => {
    if (savedDetails) reset(savedDetails);
  }, [reset, savedDetails]);

  const pickGarageImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to add a garage image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setGarageImage({
      uri: asset.uri,
      base64: asset.base64 ?? undefined,
      mimeType: asset.base64 ? "image/jpeg" : asset.mimeType ?? undefined,
    });
  };

  const save = async (details: GarageDetailsForm) => {
    try {
      await updateGarageDetails(
        details as GarageDetails,
        garageImage
          ? {
              uri: garageImage.uri,
              data: {
                base64: garageImage.base64,
                mimeType: garageImage.mimeType,
              },
            }
          : undefined,
      );

      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shops-tab"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["garage-details"] }),
      ]).catch((cacheError) => {
        console.warn("Garage details saved, but cache refresh failed.", cacheError);
      });
      backOrReplace(router, "/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Could not save",
        error?.message ?? "Garage details could not be updated.",
      );
    }
  };

  const scrollToBio = () => {
    [120, 360].forEach((delay) => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, delay);
    });
  };

  return (
    <KeyboardScreen style={styles.container} keyboardVerticalOffset={0}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...keyboardScrollProps}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      >
        <Text style={styles.kicker}>SELLER PROFILE</Text>
        <Text style={styles.title}>Seller Profile</Text>
        <Text style={styles.body}>
          This is the public name and contact information buyers see when they
          view your garage.
        </Text>

        <Pressable style={styles.imagePicker} onPress={pickGarageImage}>
          {garageImage?.uri || savedDetails?.garageImageUrl ? (
            <Image
              source={{ uri: garageImage?.uri ?? savedDetails?.garageImageUrl }}
              style={styles.garageImage}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.imagePickerText}>Add garage image</Text>
          )}
        </Pressable>

        <Controller
          control={control}
          name="garageName"
          render={({ field: { onChange, value } }) => (
            <Field
              label="GARAGE NAME"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="c9d141fb"
            />
          )}
        />
        <Controller
          control={control}
          name="contactEmail"
          render={({ field: { onChange, value } }) => (
            <Field
              label="CONTACT EMAIL"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="you@email.com"
              keyboardType="email-address"
            />
          )}
        />
        {errors.contactEmail?.message ? (
          <Text style={styles.error}>{errors.contactEmail.message}</Text>
        ) : null}
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <Field
              label="PHONE"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="(612) 555-0199"
              keyboardType="phone-pad"
            />
          )}
        />
        <Controller
          control={control}
          name="website"
          render={({ field: { onChange, value } }) => (
            <Field
              label="WEBSITE"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="garage.com"
              keyboardType="url"
            />
          )}
        />
        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, value } }) => (
            <Field
              label="CITY"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="Minneapolis"
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, value } }) => (
            <Field
              label="BIO"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="What do you build, sell, or restore?"
              multiline
              onFocus={scrollToBio}
            />
          )}
        />

        <Pressable
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSubmit(save)}
          disabled={isSubmitting}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? "SAVING..." : "SAVE GARAGE DETAILS"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  content: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.xl,
    paddingBottom: 260,
  },
  kicker: TYPE.label,
  title: {
    ...TYPE.pageTitle,
    fontSize: 34,
    lineHeight: 38,
    marginTop: SPACING.sm,
  },
  body: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  imagePicker: {
    width: 92,
    height: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.gray100,
  },
  garageImage: {
    width: "100%",
    height: "100%",
  },
  imagePickerText: {
    fontSize: 12,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: S.formLabel,
  input: {
    ...S.input,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.black,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  error: {
    ...TYPE.monoSmall,
    color: COLORS.error,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: SPACING.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.6,
    color: COLORS.black,
  },
});
