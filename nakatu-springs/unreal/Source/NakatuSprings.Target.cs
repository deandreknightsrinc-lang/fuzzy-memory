using UnrealBuildTool;

public class NakatuSpringsTarget : TargetRules
{
	public NakatuSpringsTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("NakatuSprings");
	}
}
