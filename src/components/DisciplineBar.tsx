import {
  IconBolt,
  IconBuildingBridge,
  IconBuildingFactory,
  IconCpu,
  IconFlask,
  IconHeartbeat,
  IconLeaf,
  IconRocket,
  IconSettings,
} from "@tabler/icons-react";

// The four official SHPE logo colors, repeating across the bar
const COLORS = [
  { bg: "#D33A02", icon: "#ffffff" },
  { bg: "#FD652F", icon: "#ffffff" },
  { bg: "#72A9BE", icon: "#001F5B" },
  { bg: "#0070C0", icon: "#ffffff" },
];

const DISCIPLINES = [
  { name: "Civil", Icon: IconBuildingBridge },
  { name: "Mechanical", Icon: IconSettings },
  { name: "Electrical", Icon: IconBolt },
  { name: "Computer", Icon: IconCpu },
  { name: "Chemical", Icon: IconFlask },
  { name: "Aerospace", Icon: IconRocket },
  { name: "Biomedical", Icon: IconHeartbeat },
  { name: "Environmental", Icon: IconLeaf },
  { name: "Industrial", Icon: IconBuildingFactory },
];

/**
 * Bar of engineering disciplines in SHPE colors. Shown under every page
 * header and above the footer. Hover a block to see its name.
 */
export default function DisciplineBar({ size = "md" }: { size?: "sm" | "md" }) {
  const height = size === "sm" ? "h-7" : "h-9";
  const iconSize = size === "sm" ? 16 : 19;

  return (
    <div
      role="img"
      aria-label={`Engineering disciplines: ${DISCIPLINES.map((d) => d.name).join(", ")}`}
      className="flex w-full"
    >
      {DISCIPLINES.map(({ name, Icon }, i) => {
        const c = COLORS[i % COLORS.length];
        return (
          <div
            key={name}
            title={name}
            className={`flex ${height} flex-1 items-center justify-center`}
            style={{ backgroundColor: c.bg, color: c.icon }}
          >
            <Icon size={iconSize} stroke={1.75} aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}
