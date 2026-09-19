using Microsoft.VisualStudio.TestTools.UnitTesting;

// MSTest runs sequentially by default, which surprises people arriving
// from xUnit. https://endtoendtester.com/tools/mstest
[assembly: Parallelize(Workers = 4, Scope = ExecutionScope.ClassLevel)]
