import { COLORS, F, SPACING, TYPE } from "@/constants/design";
import { S } from "@/constants/styles";
import {
  fetchGarageDetails,
  updateGarageDetails,
  type GarageDetails,
} from "@/lib/garage-profile-db";
import { backOrReplace } from "@/lib/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  multiline?: boolean;
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
      />
    </View>
  );
}

export default function GarageDetailsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GarageDetailsForm>({
    resolver: zodResolver(garageDetailsSchema),
    defaultValues: {
      garageName: "",
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

  useEffect(() => {
    if (savedDetails) reset(savedDetails);
  }, [reset, savedDetails]);

  const save = async (details: GarageDetailsForm) => {
    try {
      await updateGarageDetails(details as GarageDetails);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shops-tab"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["garage-details"] }),
      ]);
      backOrReplace(router, "/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Could not save",
        error?.message ?? "Garage details could not be updated.",
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>SELLER PROFILE</Text>
      <Text style={styles.title}>Garage Details</Text>
      <Text style={styles.body}>
        This is the public name and contact information buyers see when they
        view your garage.
      </Text>

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
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  content: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
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
