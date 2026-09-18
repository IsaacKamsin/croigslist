import { ScreenHeader } from "@/components/ScreenHeader";
import { COLORS, F, IMAGE_CACHE, SPACING } from "@/constants/design";
import { S } from "@/constants/styles";
import { hapticMedium } from "@/hooks/useHaptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import {
  MapPinIcon,
  PlusIcon,
} from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

type Ride = {
  id: string;
  title: string;
  route: string;
  area: string;
  date: string;
  time: string;
  distance: string;
  style: string;
  maxRiders: number;
  image: string;
  routePoints: {
    start: {
      label: string;
      lat: number;
      lng: number;
    };
    finish: {
      label: string;
      lat: number;
      lng: number;
    };
  };
  organizer: {
    name: string;
    bike: string;
    color: string;
  };
  attendees: {
    name: string;
    bike: string;
    color: string;
  }[];
};

type RouteTrailPoint = {
  x: number;
  y: number;
};

const ROUTE_DOT_RADIUS = 1.35;
const ROUTE_TRAIL_OUTER_WIDTH = 3.4;
const ROUTE_TRAIL_INNER_WIDTH = 2.1;
const ROUTE_EDGE_TRIM = ROUTE_DOT_RADIUS + ROUTE_TRAIL_OUTER_WIDTH / 2;
const ROUTE_TRAILS: Record<string, RouteTrailPoint[]> = {
  "stillwater-sunday": [
    { x: 0, y: 0 },
    { x: 0.08, y: -0.04 },
    { x: 0.15, y: 0.03 },
    { x: 0.22, y: 0.01 },
    { x: 0.29, y: -0.05 },
    { x: 0.36, y: -0.02 },
    { x: 0.44, y: 0.05 },
    { x: 0.51, y: 0.02 },
    { x: 0.59, y: -0.04 },
    { x: 0.66, y: -0.01 },
    { x: 0.74, y: 0.04 },
    { x: 0.82, y: 0.01 },
    { x: 0.91, y: -0.03 },
    { x: 1, y: 0 },
  ],
  "river-road": [
    { x: 0, y: 0 },
    { x: 0.1, y: 0.06 },
    { x: 0.2, y: 0.02 },
    { x: 0.28, y: -0.05 },
    { x: 0.38, y: -0.02 },
    { x: 0.48, y: 0.05 },
    { x: 0.57, y: 0.01 },
    { x: 0.67, y: -0.04 },
    { x: 0.76, y: 0.03 },
    { x: 0.88, y: 0.02 },
    { x: 1, y: 0 },
  ],
  "north-loop": [
    { x: 0, y: 0 },
    { x: 0.1, y: -0.02 },
    { x: 0.18, y: -0.01 },
    { x: 0.28, y: 0.035 },
    { x: 0.39, y: 0.015 },
    { x: 0.5, y: -0.04 },
    { x: 0.61, y: -0.025 },
    { x: 0.72, y: 0.025 },
    { x: 0.84, y: 0.015 },
    { x: 0.93, y: -0.015 },
    { x: 1, y: 0 },
  ],
};

function getRoutePinPositions(ride: Ride) {
  if (!ride.routePoints) {
    const [start, finish] = ride.route.split(" -> ");
    return [
      {
        label: start ?? ride.area,
        x: 22,
        y: 30,
        dotX: 22,
        dotY: 56,
        left: "22%",
        top: "30%",
      },
      {
        label: finish ?? ride.route,
        x: 68,
        y: 30,
        dotX: 68,
        dotY: 56,
        left: "68%",
        top: "30%",
      },
    ];
  }

  const { start, finish } = ride.routePoints;
  const west = Math.min(start.lng, finish.lng);
  const east = Math.max(start.lng, finish.lng);
  const south = Math.min(start.lat, finish.lat);
  const north = Math.max(start.lat, finish.lat);
  const lngSpan = Math.max(east - west, 0.01);
  const latSpan = Math.max(north - south, 0.01);
  const xMin = 20;
  const xMax = 76;
  const yMin = 26;
  const yMax = 34;

  const pinFor = (point: Ride["routePoints"]["start"]) => {
    const x = xMin + ((point.lng - west) / lngSpan) * (xMax - xMin);
    const y = yMax - ((point.lat - south) / latSpan) * (yMax - yMin);

    return {
      label: point.label,
      x,
      y,
      dotX: x,
      dotY: 58,
      left: `${x}%`,
      top: `${y}%`,
    };
  };

  return [pinFor(start), pinFor(finish)];
}

function trimRouteEndpoints(points: RouteTrailPoint[], trimDistance: number) {
  if (points.length < 2) return points;
  const next = points[1];
  const start = points[0];
  const beforeEnd = points[points.length - 2];
  const end = points[points.length - 1];
  const trimStart = Math.min(trimDistance, Math.hypot(next.x - start.x, next.y - start.y) / 2);
  const trimEnd = Math.min(trimDistance, Math.hypot(end.x - beforeEnd.x, end.y - beforeEnd.y) / 2);
  const startLength = Math.hypot(next.x - start.x, next.y - start.y) || 1;
  const endLength = Math.hypot(end.x - beforeEnd.x, end.y - beforeEnd.y) || 1;

  return [
    {
      x: start.x + ((next.x - start.x) / startLength) * trimStart,
      y: start.y + ((next.y - start.y) / startLength) * trimStart,
    },
    ...points.slice(1, -1),
    {
      x: end.x - ((end.x - beforeEnd.x) / endLength) * trimEnd,
      y: end.y - ((end.y - beforeEnd.y) / endLength) * trimEnd,
    },
  ];
}

function getRouteTrailPath(routePins: ReturnType<typeof getRoutePinPositions>, rideId?: string) {
  const [firstPin, secondPin] = routePins;
  if (!firstPin || !secondPin) return "";
  const [start, finish] = firstPin.dotX <= secondPin.dotX
    ? [firstPin, secondPin]
    : [secondPin, firstPin];
  const sourcePoints = ROUTE_TRAILS[rideId ?? ""] ?? ROUTE_TRAILS["stillwater-sunday"];
  const deltaX = finish.dotX - start.dotX;
  const deltaY = finish.dotY - start.dotY;
  const routeLength = Math.hypot(deltaX, deltaY) || 1;
  const routeAngle = Math.atan2(deltaY, deltaX);
  const cos = Math.cos(routeAngle);
  const sin = Math.sin(routeAngle);

  const projectedPoints = sourcePoints.map((point) => ({
    x: start.dotX + (point.x * routeLength * cos - point.y * routeLength * sin),
    y: start.dotY + (point.x * routeLength * sin + point.y * routeLength * cos),
  }));
  const trimmedPoints = trimRouteEndpoints(projectedPoints, ROUTE_EDGE_TRIM);
  const [firstPoint, ...restPoints] = trimmedPoints;

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...restPoints.map((point) => `L ${point.x} ${point.y}`),
  ].join(" ");
}

const getRouteTrailPoints = getRouteTrailPath;

const RIDES: Ride[] = [
  {
    id: "stillwater-sunday",
    title: "Sunday Morning Ride",
    route: "Minneapolis -> Stillwater",
    area: "Northeast Minneapolis",
    date: "Sun, Sep 20",
    time: "9:00 AM",
    distance: "~80 miles",
    style: "Cafe / vintage",
    maxRiders: 8,
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Stillwater%20Minnesota.jpg?width=1200",
    routePoints: {
      start: { label: "Minneapolis", lat: 44.9778, lng: -93.265 },
      finish: { label: "Stillwater", lat: 45.056, lng: -92.806 },
    },
    organizer: { name: "Isaac", bike: "CB750", color: COLORS.black },
    attendees: [
      { name: "Isaac", bike: "CB750", color: COLORS.black },
      { name: "Maya", bike: "R100", color: COLORS.accent },
      { name: "Leo", bike: "KZ400", color: COLORS.accentAlt },
      { name: "Sam", bike: "Bonneville", color: COLORS.gray600 },
      { name: "Nina", bike: "SR500", color: COLORS.gray400 },
      { name: "Owen", bike: "XS650", color: COLORS.gray800 },
    ],
  },
  {
    id: "river-road",
    title: "River Road Shakeout",
    route: "St. Paul -> Prescott",
    area: "Cathedral Hill",
    date: "Sat, Sep 26",
    time: "10:30 AM",
    distance: "~55 miles",
    style: "Standards / cruisers",
    maxRiders: 10,
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/St%20croix%20mississippi%20confluence%20prescott%20wi.jpg?width=1200",
    routePoints: {
      start: { label: "St. Paul", lat: 44.9537, lng: -93.09 },
      finish: { label: "Prescott", lat: 44.7489, lng: -92.802 },
    },
    organizer: { name: "Rae", bike: "Sportster", color: COLORS.accent },
    attendees: [
      { name: "Rae", bike: "Sportster", color: COLORS.accent },
      { name: "Miles", bike: "W650", color: COLORS.black },
      { name: "Tess", bike: "Guzzi V7", color: COLORS.gray500 },
    ],
  },
  {
    id: "north-loop",
    title: "North Loop Coffee Roll",
    route: "North Loop -> Lake Minnetonka",
    area: "Modist Brewing",
    date: "Sun, Sep 27",
    time: "8:15 AM",
    distance: "~42 miles",
    style: "All bikes",
    maxRiders: 12,
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lake%20Minnetonka%20in%20Excelsior%2C%20Aug%202023%201.jpg?width=1200",
    routePoints: {
      start: { label: "North Loop", lat: 44.9848, lng: -93.2793 },
      finish: { label: "Lake Minnetonka", lat: 44.9086, lng: -93.5661 },
    },
    organizer: { name: "Cole", bike: "Dyna", color: COLORS.gray700 },
    attendees: [
      { name: "Cole", bike: "Dyna", color: COLORS.gray700 },
      { name: "June", bike: "Thruxton", color: COLORS.accentAlt },
      { name: "Ari", bike: "CL350", color: COLORS.accent },
      { name: "Ben", bike: "R nineT", color: COLORS.black },
    ],
  },
];

function AttendeeStack({ ride, joined }: { ride: Ride; joined: boolean }) {
  const attendees = joined
    ? [{ name: "You", bike: "Your bike", color: COLORS.black }, ...ride.attendees]
    : ride.attendees;
  const visible = attendees.slice(0, 3);
  const extraCount = Math.max(attendees.length - visible.length, 0);

  return (
    <View style={styles.cardAttendeePill}>
      <View style={styles.avatarStack}>
        {visible.map((attendee, index) => (
          <View
            key={`${attendee.name}-${index}`}
            style={[
              styles.avatar,
              {
                backgroundColor: attendee.color,
                marginLeft: index === 0 ? 0 : -9,
                zIndex: visible.length - index,
              },
            ]}
          >
            <Text style={styles.avatarText}>{attendee.name[0]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.cardAttendeeText}>
        {extraCount > 0 ? `+${extraCount} others` : `${attendees.length} going`}
      </Text>
    </View>
  );
}

function RideCard({
  ride,
  joined,
  onOpen,
}: {
  ride: Ride;
  joined: boolean;
  onOpen: () => void;
}) {
  const riderCount = ride.attendees.length + (joined ? 1 : 0);
  const rideMeta = `${ride.date} · ${ride.time}`;
  const rideCapacity = `${riderCount}/${ride.maxRiders}`;

  return (
    <Pressable style={styles.rideCard} onPress={onOpen}>
      <View style={styles.cardMain}>
        <Image
          source={{ uri: ride.image }}
          style={styles.cardThumb}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE}
        />
        <View style={styles.cardCopy}>
          <Pressable
            style={[styles.cardStatusPill, joined && styles.cardStatusPillActive]}
            onPress={onOpen}
          >
            <Text style={[styles.cardStatusText, joined && styles.cardStatusTextActive]}>
              {joined ? "Joined" : "Join ride"} · {rideMeta}
            </Text>
          </Pressable>
          <Text style={styles.cardTitle}>{ride.title}</Text>
          <View style={styles.routeRow}>
            <MapPinIcon size={14} color={COLORS.textMuted} weight="fill" />
            <Text style={styles.routeText} numberOfLines={1}>
              {ride.route} · {ride.distance}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerMeta}>{ride.style}</Text>
        <View style={styles.footerRight}>
          <Text style={styles.capacityPill}>{rideCapacity}</Text>
          <AttendeeStack ride={ride} joined={joined} />
        </View>
      </View>
    </Pressable>
  );
}

export default function MotoMingleScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const [joinedRideIds, setJoinedRideIds] = useState<Set<string>>(new Set(["stillwater-sunday"]));
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const rideSheetRef = useRef<BottomSheetModal>(null);
  const rideSheetSnapPoints = useMemo(() => ["89%"], []);
  const routeCardHeight = Math.round(windowHeight * 0.4);
  const routeMapHeight = routeCardHeight;

  const toggleJoin = (rideId: string) => {
    hapticMedium();
    setJoinedRideIds((current) => {
      const next = new Set(current);
      if (next.has(rideId)) {
        next.delete(rideId);
      } else {
        next.add(rideId);
      }
      return next;
    });
  };

  const openRideSheet = (ride: Ride) => {
    hapticMedium();
    setSelectedRide(ride);
    rideSheetRef.current?.present();
  };

  const selectedRideJoined = selectedRide ? joinedRideIds.has(selectedRide.id) : false;
  const selectedRideCount = selectedRide
    ? selectedRide.attendees.length + (selectedRideJoined ? 1 : 0)
    : 0;
  const selectedRideAttendees = useMemo(() => {
    if (!selectedRide) return [];
    return selectedRideJoined
      ? [{ name: "You", bike: "Your bike", color: COLORS.black }, ...selectedRide.attendees]
      : selectedRide.attendees;
  }, [selectedRide, selectedRideJoined]);
  const selectedRideAttendeeSummary = useMemo(() => {
    if (selectedRideAttendees.length === 0) return "";
    const summaryAttendees = selectedRide
      ? selectedRideAttendees.filter((attendee) => attendee.name !== selectedRide.organizer.name)
      : selectedRideAttendees;
    const names = (summaryAttendees.length > 0 ? summaryAttendees : selectedRideAttendees).map(
      (attendee) => attendee.name,
    );
    if (names.length === 1) return `${names[0]} is going.`;
    if (names.length <= 4) {
      return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are going.`;
    }
    return `${names.slice(0, 3).join(", ")} and ${names.length - 3} others are going.`;
  }, [selectedRide, selectedRideAttendees]);
  const selectedRideRoutePins = useMemo(
    () => (selectedRide ? getRoutePinPositions(selectedRide) : []),
    [selectedRide],
  );
  const selectedRideRouteTrail = useMemo(
    () => getRouteTrailPoints(selectedRideRoutePins, selectedRide?.id),
    [selectedRideRoutePins, selectedRide?.id],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );

  const handleRideSheetPrimary = () => {
    if (!selectedRide) return;
    if (selectedRideJoined) {
      Alert.alert("Ride chat", "Ride chat opens here once ride chats are wired up.");
      return;
    }
    toggleJoin(selectedRide.id);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="RIDES"
        right={
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => {
              hapticMedium();
              Alert.alert("Create a Ride", "Ride creation is next: photo, route, date, tags, and max riders.");
            }}
            accessibilityRole="button"
            accessibilityLabel="Create a ride"
          >
            <PlusIcon size={20} color={COLORS.textPrimary} weight="bold" />
            <Text style={styles.createButtonText}>RIDE</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedLocation}>Minneapolis</Text>
          <Text style={styles.feedMeta}>{RIDES.length} nearby</Text>
        </View>

        {RIDES.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            joined={joinedRideIds.has(ride.id)}
            onOpen={() => openRideSheet(ride)}
          />
        ))}
      </ScrollView>

      <BottomSheetModal
        ref={rideSheetRef}
        snapPoints={rideSheetSnapPoints}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={false}
        enablePanDownToClose
        handleComponent={() => null}
        backgroundStyle={styles.sheetBg}
      >
        {selectedRide ? (
          <BottomSheetView style={styles.sheetFrame}>
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <BottomSheetScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
            >
              <View style={styles.sheetTopHeader}>
                <Text style={styles.sheetTitle}>{selectedRide.title}</Text>
                <Text style={styles.sheetSubhead}>{selectedRide.style}</Text>
              </View>

              <View style={styles.sheetRouteBleed}>
                <View style={[styles.sheetRouteCard, { height: routeCardHeight }]}>
                  <Image
                    source={{ uri: selectedRide.image }}
                    style={[styles.sheetRouteImage, { height: routeMapHeight }]}
                    contentFit="cover"
                    cachePolicy={IMAGE_CACHE}
                  />
                  <View style={[styles.sheetRouteScrim, { height: routeMapHeight }]} />
                  <View style={[styles.sheetRouteMap, { height: routeMapHeight }]}>
                    {selectedRideRouteTrail ? (
                      <Svg
                        pointerEvents="none"
                        style={styles.sheetRouteTrail}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <Path
                          d={selectedRideRouteTrail}
                          fill="none"
                          stroke={COLORS.white}
                          strokeWidth={ROUTE_TRAIL_OUTER_WIDTH}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.9}
                        />
                        <Path
                          d={selectedRideRouteTrail}
                          fill="none"
                          stroke="#FC4C02"
                          strokeWidth={ROUTE_TRAIL_INNER_WIDTH}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    ) : null}
                    {selectedRideRoutePins.map((pin) => (
                      <View
                        key={pin.label}
                        style={[
                          styles.sheetRoutePinGroup,
                          {
                            left: `${pin.dotX}%`,
                            top: `${pin.dotY - 22}%`,
                          },
                        ]}
                      >
                        <Text style={styles.sheetRoutePinLabel}>{pin.label}</Text>
                        <View style={styles.sheetRouteStem} />
                      </View>
                    ))}
                    <Svg
                      pointerEvents="none"
                      style={styles.sheetRouteEndpointLayer}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {selectedRideRoutePins.map((pin) => (
                        <Circle
                          key={`${pin.label}-dot`}
                          cx={pin.dotX}
                          cy={pin.dotY}
                          r={ROUTE_DOT_RADIUS}
                          fill="#FC4C02"
                          stroke={COLORS.white}
                          strokeWidth={0.55}
                        />
                      ))}
                    </Svg>
                  </View>
                </View>
              </View>

              <View style={styles.sheetInfoPanel}>
                <View style={styles.sheetRouteReadout}>
                  <View style={styles.sheetRouteMetric}>
                    <Text style={styles.sheetRouteMetricLabel}>Date</Text>
                    <Text style={styles.sheetRouteMetricValue}>{selectedRide.date}</Text>
                  </View>
                  <View style={styles.sheetRouteMetric}>
                    <Text style={styles.sheetRouteMetricLabel}>Meet time</Text>
                    <Text style={styles.sheetRouteMetricValue}>{selectedRide.time}</Text>
                  </View>
                  <View style={styles.sheetRouteMetric}>
                    <Text style={styles.sheetRouteMetricLabel}>Distance</Text>
                    <Text style={styles.sheetRouteMetricValue}>{selectedRide.distance}</Text>
                  </View>
                </View>

                <View style={styles.sheetHostRow}>
                  <View style={[styles.sheetHostAvatar, { backgroundColor: selectedRide.organizer.color }]}>
                    <Text style={styles.sheetHostAvatarText}>{selectedRide.organizer.name[0]}</Text>
                  </View>
                  <View style={styles.sheetHostCopy}>
                    <Text style={styles.sheetHostLabel}>Ride Leader</Text>
                    <Text style={styles.sheetHostName}>
                      {selectedRide.organizer.name} · {selectedRide.organizer.bike}
                    </Text>
                  </View>
                  <View style={styles.sheetMeetCopy}>
                    <Text style={styles.sheetHostLabel}>Meet</Text>
                    <Text style={styles.sheetMeetText}>{selectedRide.area}</Text>
                  </View>
                </View>

                <View style={styles.sheetAttendees}>
                  <View style={styles.sheetSectionHeader}>
                    <Text style={styles.sheetSectionLabel}>Going</Text>
                    <Text style={styles.sheetSectionCount}>{selectedRideCount}</Text>
                  </View>
                  <View style={styles.sheetAttendeeSummary}>
                  <View style={styles.sheetAttendeeStack}>
                    {selectedRideAttendees.slice(0, 5).map((attendee, index) => (
                        <View
                          key={`${selectedRide.id}-${attendee.name}`}
                          style={[
                            styles.sheetSummaryAvatar,
                            {
                              backgroundColor: attendee.color,
                              marginLeft: index === 0 ? 0 : -8,
                              zIndex: selectedRideAttendees.length - index,
                            },
                          ]}
                        >
                          <Text style={styles.sheetSummaryAvatarText}>{attendee.name[0]}</Text>
                        </View>
                      ))}
                      {selectedRideAttendees.length > 5 ? (
                        <View style={styles.sheetSummaryMore}>
                          <Text style={styles.sheetSummaryMoreText}>
                            +{selectedRideAttendees.length - 5}
                          </Text>
                      </View>
                    ) : null}
                    <View style={styles.sheetRiderCountPill}>
                      <Text style={styles.sheetRiderCountText}>
                        {selectedRideCount}/{selectedRide.maxRiders}
                      </Text>
                    </View>
                  </View>
                    <Text style={styles.sheetAttendeeSummaryText}>
                      {selectedRideAttendeeSummary}
                    </Text>
                  </View>
                </View>
              </View>
            </BottomSheetScrollView>
            <View style={styles.sheetFooter}>
              <Pressable
                style={[
                  styles.sheetPrimary,
                  selectedRideJoined && styles.sheetPrimaryJoined,
                ]}
                onPress={handleRideSheetPrimary}
              >
                <Text
                  style={[
                    styles.sheetPrimaryText,
                    selectedRideJoined && styles.sheetPrimaryTextJoined,
                  ]}
                >
                  {selectedRideJoined ? "OPEN CHAT" : "JOIN RIDE"}
                </Text>
              </Pressable>
            </View>
          </BottomSheetView>
        ) : null}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: S.screenContainer,
  createButton: {
    minWidth: 84,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.divider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },
  createButtonPressed: {
    backgroundColor: COLORS.gray100,
  },
  createButtonText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.textPrimary,
  },
  content: {
    paddingBottom: 120,
  },
  feedHeader: {
    marginHorizontal: SPACING.page,
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  feedLocation: {
    flex: 1,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  feedMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  rideCard: {
    marginHorizontal: SPACING.page,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.dividerLight,
  },
  cardMain: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    paddingBottom: 12,
  },
  cardThumb: {
    width: 82,
    height: 82,
    borderRadius: 14,
    backgroundColor: COLORS.gray200,
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
  },
  cardCopy: {
    flex: 1,
    minHeight: 82,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  cardStatusPill: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  cardStatusPillActive: {
    backgroundColor: COLORS.black,
  },
  cardStatusText: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: F.bold,
    color: COLORS.textSecondary,
  },
  cardStatusTextActive: {
    color: COLORS.white,
  },
  cardTitle: {
    fontSize: 21,
    lineHeight: 23,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: F.semibold,
    color: COLORS.textMuted,
  },
  cardFooter: {
    minHeight: 45,
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
  },
  footerMeta: {
    flex: 1,
    fontSize: 11,
    lineHeight: 13,
    fontFamily: F.monoBold,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  capacityPill: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 9,
    textAlignVertical: "center",
    fontSize: 10,
    lineHeight: 28,
    letterSpacing: 0.6,
    fontFamily: F.bold,
    color: COLORS.black,
  },
  cardAttendeePill: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 3,
    paddingRight: 9,
  },
  avatarStack: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 9,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  cardAttendeeText: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: F.bold,
    color: COLORS.black,
    marginLeft: 2,
  },
  sheetBg: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.gray300,
  },
  sheetHandleWrap: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  sheetFrame: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.divider,
  },
  sheetScroll: {
    flex: 1,
    marginBottom: 112,
  },
  sheetContent: {
    paddingHorizontal: SPACING.page,
    paddingBottom: 24,
  },
  sheetFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.page,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: COLORS.bg,
  },
  sheetTopHeader: {
    marginHorizontal: -SPACING.page,
    paddingHorizontal: SPACING.page,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
  },
  sheetHeader: {
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 26,
    lineHeight: 28,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  sheetSubhead: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.monoBold,
    letterSpacing: 0.8,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  sheetRouteCard: {
    overflow: "hidden",
    backgroundColor: COLORS.black,
  },
  sheetRouteBleed: {
    marginHorizontal: -SPACING.page,
  },
  sheetInfoPanel: {
    marginHorizontal: -SPACING.page,
    marginTop: 0,
    paddingHorizontal: SPACING.page,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: COLORS.bg,
  },
  sheetRouteImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: COLORS.gray200,
  },
  sheetRouteScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  sheetRouteMap: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
  },
  sheetRouteTrail: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetRouteEndpointLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetRoutePinGroup: {
    position: "absolute",
    alignItems: "center",
    width: 112,
    marginLeft: -56,
  },
  sheetRoutePinLabel: {
    fontSize: 8,
    lineHeight: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.8,
    color: COLORS.white,
    textTransform: "uppercase",
    marginBottom: 4,
    backgroundColor: COLORS.overlay75,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center",
  },
  sheetRouteStem: {
    width: 1,
    height: 15,
    backgroundColor: COLORS.white,
    opacity: 0.75,
  },
  sheetRouteReadout: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 14,
    columnGap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.dividerLight,
    marginBottom: 12,
  },
  sheetRouteMetric: {
    width: "30%",
    alignItems: "flex-start",
  },
  sheetRouteMetricLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: F.bold,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sheetRouteMetricValue: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
    marginBottom: 0,
  },
  sheetHostRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 12,
  },
  sheetHostAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHostAvatarText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  sheetHostCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetMeetCopy: {
    flex: 1.15,
    minWidth: 0,
    alignItems: "flex-end",
  },
  sheetHostLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: F.monoBold,
    letterSpacing: 1.1,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  sheetHostName: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  sheetMeetText: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: F.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
    textAlign: "right",
  },
  sheetAttendees: {
    marginBottom: 10,
  },
  sheetSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetSectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1.1,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  sheetSectionCount: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: F.monoBold,
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  sheetAttendeeSummary: {
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerLight,
    paddingTop: 14,
  },
  sheetAttendeeStack: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetSummaryAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSummaryAvatarText: {
    fontSize: 10,
    fontFamily: F.bold,
    color: COLORS.white,
  },
  sheetSummaryMore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  sheetSummaryMoreText: {
    fontSize: 10,
    fontFamily: F.bold,
    color: COLORS.black,
  },
  sheetRiderCountPill: {
    minWidth: 44,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    marginLeft: 8,
  },
  sheetRiderCountText: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: F.bold,
    color: COLORS.black,
  },
  sheetAttendeeSummaryText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: F.semibold,
    color: COLORS.textPrimary,
  },
  sheetPrimary: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sheetPrimaryJoined: {
    backgroundColor: COLORS.black,
  },
  sheetPrimaryText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: F.monoBold,
    letterSpacing: 1.4,
    color: COLORS.white,
  },
  sheetPrimaryTextJoined: {
    color: COLORS.white,
  },
});
