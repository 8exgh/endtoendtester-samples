using NUnit.Framework;

// Fixtures in parallel, tests within a fixture sequential. Because NUnit
// shares one instance across a fixture's tests, this is the safe default —
// see https://endtoendtester.com/tools/nunit
[assembly: Parallelizable(ParallelScope.Fixtures)]
[assembly: LevelOfParallelism(4)]
