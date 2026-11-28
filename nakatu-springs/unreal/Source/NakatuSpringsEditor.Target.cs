using UnrealBuildTool;

public class NakatuSpringsEditorTarget : TargetRules
{
	public NakatuSpringsEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("NakatuSprings");
	}
}
