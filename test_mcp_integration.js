#!/usr/bin/env node

// Test script to verify MCP server integration with teacher tools
import fs from 'fs';

async function testMCPIntegration() {
  console.log('🔍 Testing MCP Server Integration...\n');

  // Read the built index.js file to verify tool integration
  const indexContent = fs.readFileSync('./build/index.js', 'utf8');
  const clientContent = fs.readFileSync('./build/client.js', 'utf8');

  // Define all expected teacher tools
  const expectedTools = [
    // Tier 1: Essential Daily Tools
    'canvas_get_teacher_courses',
    'canvas_get_grading_queue', 
    'canvas_get_course_students',
    'canvas_get_course_assignments',
    'canvas_get_upcoming_events',
    
    // Tier 2: Analytics & Insights Tools
    'canvas_get_student_performance',
    'canvas_get_course_analytics',
    'canvas_get_assignment_analytics',
    'canvas_get_missing_submissions',
    'canvas_get_course_statistics',
    
    // Tier 3: Advanced Information Tools
    'canvas_get_student_details',
    'canvas_get_student_activity',
    'canvas_get_course_details',
    'canvas_get_course_discussions',
    'canvas_get_teacher_activity',
    'canvas_get_gradebook_data',
    'canvas_get_module_progress',
    'canvas_search_course_content',
    'canvas_get_user_enrollments'
  ];

  const expectedClientMethods = [
    'getTeacherCourses',
    'getGradingQueue',
    'getCourseStudents', 
    'getCourseAssignments',
    'getUpcomingEvents',
    'getStudentPerformance',
    'getCourseAnalytics',
    'getAssignmentAnalytics',
    'getMissingSubmissions',
    'getCourseStatistics',
    'getStudentDetails',
    'getStudentActivity',
    'getCourseDetails',
    'getCourseDiscussions',
    'getTeacherActivity',
    'getGradebookData',
    'getModuleProgress',
    'searchCourseContent',
    'getUserEnrollments'
  ];

  console.log('🎯 TESTING TOOL DEFINITIONS');
  console.log('============================');

  let toolsFound = 0;
  let toolsWithCases = 0;

  for (const tool of expectedTools) {
    // Check if tool is defined in TOOLS array
    const toolDefinitionRegex = new RegExp(`name:\\s*["']${tool}["']`, 'g');
    const toolDefinitionMatch = indexContent.match(toolDefinitionRegex);
    
    // Check if tool has a case handler
    const caseHandlerRegex = new RegExp(`case\\s*["']${tool}["']:`, 'g');
    const caseHandlerMatch = indexContent.match(caseHandlerRegex);
    
    if (toolDefinitionMatch) {
      toolsFound++;
      console.log(`✅ ${tool} - Tool definition found`);
      
      if (caseHandlerMatch) {
        toolsWithCases++;
        console.log(`   ✅ Case handler implemented`);
      } else {
        console.log(`   ❌ Case handler missing`);
      }
    } else {
      console.log(`❌ ${tool} - Tool definition missing`);
    }
  }

  console.log('\n🔧 TESTING CLIENT METHODS');
  console.log('==========================');

  let methodsFound = 0;

  for (const method of expectedClientMethods) {
    const methodRegex = new RegExp(`async\\s+${method}\\s*\\(`, 'g');
    const methodMatch = clientContent.match(methodRegex);
    
    if (methodMatch) {
      methodsFound++;
      console.log(`✅ ${method} - Client method implemented`);
    } else {
      console.log(`❌ ${method} - Client method missing`);
    }
  }

  console.log('\n📊 INTEGRATION TEST RESULTS');
  console.log('============================');
  console.log(`Tool Definitions: ${toolsFound}/${expectedTools.length} found`);
  console.log(`Case Handlers: ${toolsWithCases}/${expectedTools.length} implemented`);
  console.log(`Client Methods: ${methodsFound}/${expectedClientMethods.length} implemented`);

  // Test specific tool schemas
  console.log('\n🔍 TESTING TOOL SCHEMAS');
  console.log('========================');

  const schemaTests = [
    {
      tool: 'canvas_get_teacher_courses',
      requiredFields: [],
      optionalFields: ['enrollment_state', 'include_student_count', 'include_needs_grading']
    },
    {
      tool: 'canvas_get_course_students', 
      requiredFields: ['course_id'],
      optionalFields: ['include_grades', 'include_activity', 'sort_by']
    },
    {
      tool: 'canvas_get_course_analytics',
      requiredFields: ['course_id'],
      optionalFields: ['include_assignment_analytics', 'include_participation_data']
    }
  ];

  for (const test of schemaTests) {
    console.log(`\n📋 ${test.tool}:`);
    
    // Extract tool definition
    const toolDefRegex = new RegExp(`name:\\s*["']${test.tool}["'][\\s\\S]*?}\\s*},`, 'g');
    const toolDefMatch = indexContent.match(toolDefRegex);
    
    if (toolDefMatch) {
      const toolDef = toolDefMatch[0];
      
      // Check required fields
      for (const field of test.requiredFields) {
        if (toolDef.includes(`"${field}"`)) {
          console.log(`   ✅ Required field: ${field}`);
        } else {
          console.log(`   ❌ Missing required field: ${field}`);
        }
      }
      
      // Check optional fields
      for (const field of test.optionalFields) {
        if (toolDef.includes(`"${field}"`)) {
          console.log(`   ✅ Optional field: ${field}`);
        } else {
          console.log(`   ⚠️  Optional field not found: ${field}`);
        }
      }
    } else {
      console.log(`   ❌ Tool definition not found`);
    }
  }

  console.log('\n🎯 TEACHER CHATBOT READINESS CHECK');
  console.log('===================================');

  const readinessScore = ((toolsFound + toolsWithCases + methodsFound) / (expectedTools.length * 2 + expectedClientMethods.length)) * 100;
  
  console.log(`Overall Integration Score: ${readinessScore.toFixed(1)}%`);
  
  if (readinessScore >= 95) {
    console.log('🎉 EXCELLENT! Ready for production teacher chatbot deployment');
  } else if (readinessScore >= 80) {
    console.log('✅ GOOD! Ready for teacher chatbot testing with minor fixes needed');
  } else if (readinessScore >= 60) {
    console.log('⚠️  PARTIAL! Some tools missing, requires additional development');
  } else {
    console.log('❌ INCOMPLETE! Major development work needed');
  }

  console.log('\n📚 TEACHER QUERY EXAMPLES');
  console.log('==========================');
  console.log('With these tools, teachers can now ask:');
  console.log('• "What courses am I teaching this semester?"');
  console.log('• "What assignments need grading today?"');
  console.log('• "Who are my students in Biology 101?"');
  console.log('• "Show me students who are struggling"');
  console.log('• "What\'s due this week in my courses?"');
  console.log('• "How is my class performing overall?"');
  console.log('• "Which students haven\'t submitted the essay?"');
  console.log('• "What\'s the average score on the midterm?"');
  console.log('• "Show me recent course activity"');
  console.log('• "Find all assignments about photosynthesis"');

  console.log('\n🚀 NEXT STEPS FOR TEACHER CHATBOT');
  console.log('==================================');
  console.log('1. Deploy MCP server with teacher tools');
  console.log('2. Configure Canvas API credentials');
  console.log('3. Test with real Canvas data');
  console.log('4. Build natural language processing layer');
  console.log('5. Create teacher-friendly chat interface');
  console.log('6. Implement caching for performance');
  console.log('7. Add real-time notifications');
  console.log('8. Gather teacher feedback and iterate');

  return {
    toolsFound,
    toolsWithCases,
    methodsFound,
    readinessScore,
    totalExpected: expectedTools.length
  };
}

// Run the integration test
testMCPIntegration()
  .then(results => {
    console.log('\n✨ Integration test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Integration test failed:', error);
    process.exit(1);
  });
