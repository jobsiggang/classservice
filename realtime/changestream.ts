// MongoDB Change Stream Handler
import { ChangeStream, Db } from 'mongodb';
import { WebSocketManager } from './websocket';

export class ChangeStreamHandler {
  private db: Db;
  private wsManager: WebSocketManager;
  private streams: ChangeStream[] = [];

  constructor(db: Db, wsManager: WebSocketManager) {
    this.db = db;
    this.wsManager = wsManager;
  }

  public startWatching() {
    this.watchAssignments();
    this.watchSubmissions();
    this.watchClasses();
    console.log('✅ MongoDB Change Streams started');
  }

  private watchAssignments() {
    const assignmentStream = this.db.collection('assignments').watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update', 'delete'] }
        }
      }
    ]);

    assignmentStream.on('change', (change) => {
      console.log('Assignment change detected:', change.operationType);

      if (change.operationType === 'insert') {
        const assignment = change.fullDocument as any;
        
        // Notify all students and teachers in the school
        this.wsManager.broadcastToSchool(assignment.schoolId, {
          type: 'assignment.created',
          data: {
            assignmentId: change.documentKey._id,
            title: assignment.title,
            classId: assignment.classId,
            dueDate: assignment.dueDate,
            createdAt: assignment.createdAt
          }
        });

        // Notify specifically students
        this.wsManager.broadcastToRole(assignment.schoolId, 'student', {
          type: 'notification',
          message: `새로운 과제가 등록되었습니다: ${assignment.title}`,
          data: assignment
        });
      } else if (change.operationType === 'update') {
        const updateDesc = change.updateDescription;
        const schoolId = (change.fullDocument as any)?.schoolId;

        if (schoolId) {
          this.wsManager.broadcastToSchool(schoolId, {
            type: 'assignment.updated',
            data: {
              assignmentId: change.documentKey._id,
              updates: updateDesc?.updatedFields
            }
          });
        }
      } else if (change.operationType === 'delete') {
        // For delete, we might not have fullDocument, need to handle differently
        console.log('Assignment deleted:', change.documentKey._id);
      }
    });

    this.streams.push(assignmentStream);
  }

  private watchSubmissions() {
    const submissionStream = this.db.collection('submissions').watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update'] }
        }
      }
    ]);

    submissionStream.on('change', (change) => {
      console.log('Submission change detected:', change.operationType);

      if (change.operationType === 'insert') {
        const submission = change.fullDocument as any;

        // Notify teacher about new submission
        this.wsManager.broadcastToRole(submission.schoolId, 'teacher', {
          type: 'submission.created',
          message: '새로운 과제 제출이 있습니다',
          data: {
            submissionId: change.documentKey._id,
            assignmentId: submission.assignmentId,
            studentId: submission.studentId,
            submittedAt: submission.submittedAt
          }
        });

        // Notify student of successful submission
        this.wsManager.sendToUser(submission.studentId, submission.schoolId, {
          type: 'submission.confirmed',
          message: '과제가 성공적으로 제출되었습니다',
          data: {
            submissionId: change.documentKey._id,
            assignmentId: submission.assignmentId
          }
        });
      } else if (change.operationType === 'update') {
        const submission = change.fullDocument as any;
        
        // If feedback or grade was added, notify student
        const updateFields = change.updateDescription?.updatedFields;
        if (updateFields && (updateFields.feedback || updateFields.grade)) {
          this.wsManager.sendToUser(submission.studentId, submission.schoolId, {
            type: 'submission.graded',
            message: '과제에 피드백이 추가되었습니다',
            data: {
              submissionId: change.documentKey._id,
              feedback: updateFields.feedback,
              grade: updateFields.grade
            }
          });
        }
      }
    });

    this.streams.push(submissionStream);
  }

  private watchClasses() {
    const classStream = this.db.collection('classes').watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update'] }
        }
      }
    ]);

    classStream.on('change', (change) => {
      console.log('Class change detected:', change.operationType);

      if (change.operationType === 'insert') {
        const classData = change.fullDocument as any;

        this.wsManager.broadcastToSchool(classData.schoolId, {
          type: 'class.created',
          message: `새로운 학급이 생성되었습니다: ${classData.name}`,
          data: {
            classId: change.documentKey._id,
            name: classData.name,
            grade: classData.grade
          }
        });
      } else if (change.operationType === 'update') {
        const classData = change.fullDocument as any;
        const updateFields = change.updateDescription?.updatedFields;

        // If students were added, notify them
        if (updateFields?.studentIds || updateFields?.teacherIds) {
          this.wsManager.broadcastToSchool(classData.schoolId, {
            type: 'class.updated',
            data: {
              classId: change.documentKey._id,
              updates: updateFields
            }
          });
        }
      }
    });

    this.streams.push(classStream);
  }

  public stop() {
    this.streams.forEach(stream => stream.close());
    this.streams = [];
    console.log('MongoDB Change Streams stopped');
  }
}
